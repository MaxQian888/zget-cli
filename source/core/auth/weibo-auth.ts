import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {WeiboCookies, WeiboQrPollResult} from '../../types/weibo';
import {weiboCookieFile} from '../utils/config';
import {getWeiboHeaders} from '../utils/headers';

export class WeiboCookieStore {
	private cookies: WeiboCookies = {};

	async load(): Promise<void> {
		try {
			const content = await readFile(weiboCookieFile, 'utf8');
			this.cookies = JSON.parse(content) as WeiboCookies;
		} catch {
			// No cookies found
		}
	}

	async save(): Promise<void> {
		await mkdir(dirname(weiboCookieFile), {recursive: true});
		await writeFile(weiboCookieFile, JSON.stringify(this.cookies, null, 2));
	}

	setCookies(cookies: WeiboCookies): void {
		this.cookies = {...this.cookies, ...cookies};
	}

	parseCookieString(cookieString: string): void {
		for (const pair of cookieString.split(';')) {
			const [key, ...rest] = pair.trim().split('=');
			if (key && rest.length > 0) {
				this.cookies[key.trim()] = rest.join('=').trim();
			}
		}
	}

	getCookieString(): string {
		return Object.entries(this.cookies)
			.filter(([, value]) => value !== undefined && value !== '')
			.map(([key, value]) => `${key}=${value ?? ''}`)
			.join('; ');
	}

	isAuthenticated(): boolean {
		return Boolean(this.cookies.SUB && this.cookies.SUBP);
	}

	getCsrf(): string {
		return this.cookies['XSRF-TOKEN'] ?? '';
	}

	getCookie(key: string): string | undefined {
		return this.cookies[key];
	}

	clear(): void {
		this.cookies = {};
	}
}

type WeiboQrLoginCallbacks = {
	onQrReady: (imageUrl: string, qrid: string) => void | Promise<void>;
	onStatusChange: (
		status: 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error',
		message?: string,
	) => void;
};

const QR_IMAGE_URL =
	'https://login.sina.com.cn/sso/qrcode/image?entry=weibo&size=180&service_id=miniblog';
const QR_CHECK_BASE =
	'https://login.sina.com.cn/sso/qrcode/check?entry=weibo&qrid=';
const SSO_LOGIN_BASE =
	'https://login.sina.com.cn/sso/login.php?entry=weibo&returntype=TEXT&crossdomain=1&cdult=3&domain=weibo.com&savestate=30&alt=';
const CONFIG_BOOTSTRAP_URL = 'https://weibo.com/ajax/config/get_config';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000;

type SsoLoginPayload = {
	retcode?: number | string;
	uid?: string;
	nick?: string;
	crossDomainUrlList?: string[];
};

export async function performWeiboQrLogin(
	callbacks: WeiboQrLoginCallbacks,
): Promise<WeiboCookieStore> {
	const store = new WeiboCookieStore();

	// Step 1: Generate QR code (qrid + image PNG URL)
	const qrResp = await fetch(QR_IMAGE_URL, {
		headers: getWeiboHeaders(),
	});

	if (!qrResp.ok) {
		callbacks.onStatusChange('error', `获取二维码失败: ${qrResp.status}`);
		throw new Error(`QR code API failed: ${qrResp.status}`);
	}

	const qrJson = (await readJsonOrJsonp(qrResp)) as {
		retcode?: number;
		data?: {qrid?: string; image?: string};
	};

	const qrid = qrJson?.data?.qrid;
	const rawImage = qrJson?.data?.image;
	if (!qrid || !rawImage) {
		callbacks.onStatusChange('error', '二维码数据无效');
		throw new Error('QR code data invalid');
	}

	const imageUrl = rawImage.startsWith('//') ? `https:${rawImage}` : rawImage;

	await callbacks.onQrReady(imageUrl, qrid);
	callbacks.onStatusChange('waiting');

	// Step 2: Poll for scan / confirm
	const deadline = Date.now() + POLL_TIMEOUT_MS;
	let lastSignal: 'waiting' | 'scanned' | undefined;
	let alt: string | undefined;

	while (Date.now() < deadline) {
		await sleep(POLL_INTERVAL_MS);

		try {
			const pollResp = await fetch(`${QR_CHECK_BASE}${qrid}`, {
				headers: getWeiboHeaders(),
			});
			if (!pollResp.ok) continue;

			const poll = (await readJsonOrJsonp(pollResp)) as WeiboQrPollResult;
			const code = Number(poll?.retcode);

			if (code === 20_000_000) {
				alt = poll?.data?.alt ?? undefined;
				break;
			}

			if (code === 50_114_001) {
				if (lastSignal !== 'waiting') {
					callbacks.onStatusChange('waiting');
					lastSignal = 'waiting';
				}

				continue;
			}

			if (code === 50_114_002) {
				if (lastSignal !== 'scanned') {
					callbacks.onStatusChange('scanned');
					lastSignal = 'scanned';
				}

				continue;
			}

			if (code === 50_114_004) {
				callbacks.onStatusChange('expired');
				throw new Error('二维码已过期，请重新扫码');
			}

			if (code === 50_114_003) {
				callbacks.onStatusChange('expired', '已取消登录');
				throw new Error('二维码登录已取消');
			}
		} catch (error) {
			if (
				error instanceof Error &&
				(error.message.includes('过期') || error.message.includes('取消'))
			) {
				throw error;
			}
			// Transient network errors: continue polling
		}
	}

	if (!alt) {
		callbacks.onStatusChange('expired');
		throw new Error('二维码登录超时');
	}

	// Step 3: Exchange alt token for cross-domain login URLs
	const ssoResp = await fetch(`${SSO_LOGIN_BASE}${encodeURIComponent(alt)}`, {
		headers: getWeiboHeaders(),
	});
	if (!ssoResp.ok) {
		throw new Error(`SSO 登录失败: ${ssoResp.status}`);
	}

	harvestSetCookies(ssoResp, store);

	const ssoJson = (await readJsonOrJsonp(ssoResp)) as SsoLoginPayload;
	if (Number(ssoJson?.retcode) !== 0 || !ssoJson?.crossDomainUrlList?.length) {
		throw new Error('SSO 登录返回数据无效');
	}

	// Step 4: Visit each cross-domain URL to receive Set-Cookie for weibo.com / sina.com.cn
	for (const crossUrl of ssoJson.crossDomainUrlList) {
		try {
			const resp = await fetch(crossUrl, {
				headers: getWeiboHeaders(),
				redirect: 'manual',
			});
			harvestSetCookies(resp, store);
		} catch {
			// Continue with the next cross-domain hop
		}
	}

	if (!store.isAuthenticated()) {
		callbacks.onStatusChange('error', '未取得 SUB/SUBP cookie');
		throw new Error('登录失败：未取得 SUB/SUBP cookie');
	}

	// Step 5: Bootstrap XSRF-TOKEN by hitting weibo.com config endpoint
	try {
		const cfgResp = await fetch(CONFIG_BOOTSTRAP_URL, {
			headers: getWeiboHeaders(store.getCookieString()),
		});
		harvestSetCookies(cfgResp, store);
	} catch {
		// Non-fatal — write commands will surface auth issues at call time
	}

	await store.save();
	callbacks.onStatusChange('confirmed');
	return store;
}

function harvestSetCookies(response: Response, store: WeiboCookieStore): void {
	const setCookies = response.headers.getSetCookie?.() ?? [];
	for (const cookie of setCookies) {
		const [pair] = cookie.split(';');
		if (pair?.includes('=')) {
			const [name, ...rest] = pair.split('=');
			if (name) {
				store.setCookies({[name.trim()]: rest.join('=').trim()});
			}
		}
	}
}

async function readJsonOrJsonp(response: Response): Promise<unknown> {
	const text = await response.text();
	const trimmed = text.trim();
	if (!trimmed) return {};

	// Plain JSON
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			return JSON.parse(trimmed) as unknown;
		} catch {
			// Fall through to JSONP unwrap
		}
	}

	// JSONP wrapper, e.g. STK && STK.callback({...}) or callback({...})
	const jsonpMatch = /[({]\s*({[\s\S]*})\s*[)}]?\s*;?\s*$/.exec(trimmed);
	if (jsonpMatch?.[1]) {
		try {
			return JSON.parse(jsonpMatch[1]) as unknown;
		} catch {
			return {};
		}
	}

	return {};
}

async function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}
