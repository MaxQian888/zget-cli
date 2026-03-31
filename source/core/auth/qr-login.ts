import {getBrowserHeaders} from '../utils/headers';
import {CookieStore} from './cookie-store';

const zhihuBase = 'https://www.zhihu.com';
const zhihuLoginUrl = `${zhihuBase}/signin`;
const zhihuQrCodeApi = `${zhihuBase}/api/v3/account/api/login/qrcode`;
const zhihuCaptchaUrl = `${zhihuBase}/api/v3/oauth/captcha/v2?type=captcha_sign_in`;
const acceptHeader = 'Accept';
const refererHeader = 'Referer';
const originHeader = 'Origin';
const cookieHeader = 'Cookie';

type QrLoginCallbacks = {
	onQrReady: (link: string) => void | Promise<void>;
	onStatusChange: (
		status: 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error',
		message?: string,
	) => void;
};

export async function performQrLogin(
	callbacks: QrLoginCallbacks,
): Promise<CookieStore> {
	const store = new CookieStore();
	const headers = getBrowserHeaders();

	// Step 1: Load login page to get initial cookies (_xsrf, d_c0)
	const loginResp = await fetch(zhihuLoginUrl, {
		headers: {
			...headers,
			[acceptHeader]:
				'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			[refererHeader]: `${zhihuBase}/signin`,
			[originHeader]: zhihuBase,
		},
		redirect: 'follow',
	});
	extractCookies(loginResp, store);

	// Step 2: Get UDID (d_c0, q_c1)
	try {
		const udidResp = await fetch(`${zhihuBase}/udid`, {
			method: 'POST',
			headers: {
				...headers,
				'Content-Type': 'application/json',
				[refererHeader]: `${zhihuBase}/signin`,
				[originHeader]: zhihuBase,
				[cookieHeader]: store.getCookieString(),
			},
			body: '{}',
		});
		extractCookies(udidResp, store);
	} catch {
		// Non-critical
	}

	// Step 3: Captcha ticket (needed for scan confirmation flow)
	try {
		const captchaResp = await fetch(zhihuCaptchaUrl, {
			headers: {...headers, [cookieHeader]: store.getCookieString()},
		});
		extractCookies(captchaResp, store);
	} catch {
		// Non-critical
	}

	// Step 4: Get QR code token and link
	const xsrf = store.getXsrfToken() ?? '';
	const qrResp = await fetch(zhihuQrCodeApi, {
		method: 'POST',
		headers: {
			...headers,
			'Content-Type': 'application/json',
			'x-xsrftoken': xsrf,
			'x-requested-with': 'fetch',
			[refererHeader]: `${zhihuBase}/signin`,
			[originHeader]: zhihuBase,
			[cookieHeader]: store.getCookieString(),
		},
		body: '{}',
	});

	if (!qrResp.ok) {
		callbacks.onStatusChange('error', `获取二维码失败: ${qrResp.status}`);
		throw new Error(`QR code API failed: ${qrResp.status}`);
	}

	extractCookies(qrResp, store);
	const qrData = (await qrResp.json()) as Record<string, string>;
	const token = qrData.token ?? qrData.qrcode_token ?? '';
	const link = qrData.link ?? '';

	if (!token || !link) {
		callbacks.onStatusChange('error', '二维码数据无效');
		throw new Error('QR code data invalid');
	}

	await callbacks.onQrReady(link);
	callbacks.onStatusChange('waiting');

	// Step 5: Ensure _xsrf is available before polling
	if (!store.getXsrfToken()) {
		try {
			const refreshResp = await fetch(zhihuLoginUrl, {
				headers: {...headers, [cookieHeader]: store.getCookieString()},
			});
			extractCookies(refreshResp, store);
		} catch {
			// Continue anyway
		}
	}

	// Step 6: Poll scan_info until login success
	// Reference: poll every ~150ms for fast response after scan confirmation
	const scanUrl = `${zhihuQrCodeApi}/${token}/scan_info`;
	const deadline = Date.now() + 120_000; // 2 min timeout
	const pollInterval = 150; // Match reference: 0.15s

	let lastStatus: number | undefined;

	const pollScanInfo = async (): Promise<void> => {
		if (Date.now() >= deadline) {
			return;
		}

		await sleep(pollInterval);

		try {
			const currentXsrf = store.getXsrfToken() ?? '';
			const resp = await fetch(scanUrl, {
				headers: {
					...headers,
					[acceptHeader]: '*/*',
					'x-xsrftoken': currentXsrf,
					'x-requested-with': 'fetch',
					'x-zse-93': '101_3_3.0',
					[refererHeader]: `${zhihuBase}/signin?next=%2F`,
					[cookieHeader]: store.getCookieString(),
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-origin',
				},
			});

			extractCookies(resp, store);

			if (!resp.ok) {
				await pollScanInfo();
				return;
			}

			let info: Record<string, unknown> = {};
			try {
				info = (await resp.json()) as Record<string, unknown>;
			} catch {
				await pollScanInfo();
				return;
			}

			const apiStatus = info.status as number | undefined;

			if (apiStatus === 0) {
				// Not scanned yet - fall through to cookie checks below
			} else if (apiStatus === 1) {
				if (lastStatus !== 1) {
					callbacks.onStatusChange('scanned');
					lastStatus = 1;
				}
			} else if (info.access_token || info.user_id !== undefined) {
				applyCookiesFromBody(info, store);
				return;
			} else {
				const loginStatus = String(info.login_status ?? '')
					.trim()
					.toUpperCase();
				if (
					['CONFIRMED', 'LOGIN_SUCCESS', 'SUCCESS', 'OK', 'LOGGED_IN'].includes(
						loginStatus,
					)
				) {
					applyCookiesFromBody(info, store);
					return;
				}

				if (info.success === true || info.logged_in === true) {
					applyCookiesFromBody(info, store);
					return;
				}
			}

			if (store.get('z_c0')) {
				return;
			}

			applyCookiesFromBody(info, store);

			if (store.get('z_c0')) {
				return;
			}
		} catch {
			// Continue polling on network error
		}

		await pollScanInfo();
	};

	await pollScanInfo();

	// Step 7: If still missing z_c0, try fetching /me to trigger Set-Cookie
	if (!store.get('z_c0')) {
		try {
			const meResp = await fetch(`${zhihuBase}/api/v4/me`, {
				headers: {...headers, [cookieHeader]: store.getCookieString()},
			});
			extractCookies(meResp, store);
		} catch {
			// Ignore
		}
	}

	// Step 8: Validate and save
	if (!store.isAuthenticated()) {
		callbacks.onStatusChange('expired');
		throw new Error('二维码登录超时或未完成确认（未获取到 z_c0）');
	}

	await store.save();
	callbacks.onStatusChange('confirmed');
	return store;
}

/**
 * Extract cookies from Set-Cookie response headers into the store.
 */
function extractCookies(response: Response, store: CookieStore): void {
	const setCookies = response.headers.getSetCookie?.() ?? [];
	for (const cookie of setCookies) {
		const [pair] = cookie.split(';');
		if (pair?.includes('=')) {
			const [name, ...rest] = pair.split('=');
			if (name) {
				store.set(name.trim(), rest.join('=').trim());
			}
		}
	}
}

/**
 * Extract cookies from scan_info JSON response body.
 * The server may return z_c0 or a cookie string in the body
 * in addition to (or instead of) Set-Cookie headers.
 */
function applyCookiesFromBody(
	info: Record<string, unknown>,
	store: CookieStore,
): void {
	// Check for cookie string in body
	const cookieString = (info.cookie ?? info.cookies ?? '') as string;
	if (typeof cookieString === 'string' && cookieString.includes('z_c0')) {
		store.parseCookieString(cookieString);
	}

	// Check for direct z_c0 field
	if (info.z_c0) {
		store.set('z_c0', String(info.z_c0));
	}
}

async function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}
