import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {
	BiliCookies,
	BiliQrCodeData,
	BiliQrCodePollResult,
	BiliApiResponse,
} from '../../types/bilibili';
import {biliCookieFile} from '../utils/config';
import {getBiliHeaders} from '../utils/headers';

export class BiliCookieStore {
	private cookies: BiliCookies = {};

	async load(): Promise<void> {
		try {
			const content = await readFile(biliCookieFile, 'utf8');
			this.cookies = JSON.parse(content) as BiliCookies;
		} catch {
			// No cookies found
		}
	}

	async save(): Promise<void> {
		await mkdir(dirname(biliCookieFile), {recursive: true});
		await writeFile(biliCookieFile, JSON.stringify(this.cookies, null, 2));
	}

	setCookies(cookies: BiliCookies): void {
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
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => `${key}=${value ?? ''}`)
			.join('; ');
	}

	isAuthenticated(): boolean {
		return Boolean(this.cookies.SESSDATA && this.cookies.bili_jct);
	}

	getCsrf(): string {
		return this.cookies.bili_jct ?? '';
	}

	getUserId(): string {
		return this.cookies.DedeUserID ?? '';
	}

	getCookie(key: string): string | undefined {
		return this.cookies[key];
	}

	clear(): void {
		this.cookies = {};
	}
}

type BiliQrLoginCallbacks = {
	onQrReady: (url: string) => void | Promise<void>;
	onStatusChange: (
		status: 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error',
		message?: string,
	) => void;
};

export async function performBiliQrLogin(
	callbacks: BiliQrLoginCallbacks,
): Promise<BiliCookieStore> {
	const store = new BiliCookieStore();
	const headers = getBiliHeaders();

	// Step 1: Generate QR code
	const qrResp = await fetch(
		'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
		{
			headers,
		},
	);

	if (!qrResp.ok) {
		callbacks.onStatusChange('error', `获取二维码失败: ${qrResp.status}`);
		throw new Error(`QR code API failed: ${qrResp.status}`);
	}

	const qrJson = (await qrResp.json()) as BiliApiResponse<BiliQrCodeData>;
	if (qrJson.code !== 0 || !qrJson.data) {
		callbacks.onStatusChange('error', '二维码数据无效');
		throw new Error('QR code data invalid');
	}

	const {url: qrUrl, qrcode_key: qrcodeKey} = qrJson.data;

	await callbacks.onQrReady(qrUrl);
	callbacks.onStatusChange('waiting');

	// Step 2: Poll for scan result
	const deadline = Date.now() + 180_000; // 3 min timeout
	const pollInterval = 2000;

	const pollForLogin = async (): Promise<BiliCookieStore | undefined> => {
		if (Date.now() >= deadline) {
			return undefined;
		}

		await sleep(pollInterval);

		try {
			const pollResp = await fetch(
				`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrcodeKey}`,
				{headers},
			);

			if (!pollResp.ok) {
				const nextStore = await pollForLogin();
				return nextStore;
			}

			const setCookies = pollResp.headers.getSetCookie?.() ?? [];
			for (const cookie of setCookies) {
				const [pair] = cookie.split(';');
				if (pair?.includes('=')) {
					const [name, ...rest] = pair.split('=');
					if (name) {
						store.setCookies({[name.trim()]: rest.join('=').trim()});
					}
				}
			}

			const pollJson =
				(await pollResp.json()) as BiliApiResponse<BiliQrCodePollResult>;
			const pollData = pollJson.data;

			if (!pollData) {
				const nextStore = await pollForLogin();
				return nextStore;
			}

			switch (pollData.code) {
				case 0: {
					if (pollData.url) {
						const urlParameters = new URL(pollData.url).searchParams;
						for (const [key, value] of urlParameters) {
							store.setCookies({[key]: value});
						}
					}

					await store.save();
					callbacks.onStatusChange('confirmed');
					return store;
				}

				case 86_090: {
					callbacks.onStatusChange('scanned');
					const nextStore = await pollForLogin();
					return nextStore;
				}

				case 86_038: {
					callbacks.onStatusChange('expired');
					throw new Error('二维码已过期，请重新扫码');
				}

				case 86_101: {
					const nextStore = await pollForLogin();
					return nextStore;
				}

				default: {
					const nextStore = await pollForLogin();
					return nextStore;
				}
			}
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('过期')) {
				throw error;
			}

			const nextStore = await pollForLogin();
			return nextStore;
		}
	};

	const loggedInStore = await pollForLogin();
	if (loggedInStore) {
		return loggedInStore;
	}

	callbacks.onStatusChange('expired');
	throw new Error('二维码登录超时');
}

async function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}
