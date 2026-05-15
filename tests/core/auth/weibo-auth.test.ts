import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {readFileMock, writeFileMock, mkdirMock} = vi.hoisted(() => ({
	readFileMock: vi.fn(),
	writeFileMock: vi.fn(),
	mkdirMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	readFile: readFileMock,
	writeFile: writeFileMock,
	mkdir: mkdirMock,
}));

vi.mock('../../../source/core/utils/config', () => ({
	weiboCookieFile: 'D:/tmp/.zget-cli/weibo-cookies.json',
}));

import {
	WeiboCookieStore,
	performWeiboQrLogin,
} from '../../../source/core/auth/weibo-auth';

describe('WeiboCookieStore', () => {
	beforeEach(() => {
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('loads, parses, and exposes weibo auth cookies', async () => {
		readFileMock.mockResolvedValue(
			JSON.stringify({
				SUB: 'sub-token',
				SUBP: 'subp-token',
				'XSRF-TOKEN': 'xsrf-1234',
				ALF: '1799000000',
			}),
		);

		const store = new WeiboCookieStore();
		await store.load();
		store.parseCookieString('SSOLoginState=1; extra=a=b');

		expect(store.isAuthenticated()).toBe(true);
		expect(store.getCsrf()).toBe('xsrf-1234');
		expect(store.getCookie('SSOLoginState')).toBe('1');
		expect(store.getCookie('extra')).toBe('a=b');
		expect(store.getCookieString()).toContain('SUB=sub-token');
		expect(store.getCookieString()).toContain('SUBP=subp-token');
	});

	it('reports missing auth when SUB or SUBP absent', async () => {
		const store = new WeiboCookieStore();
		store.parseCookieString('SUB=only-sub');
		expect(store.isAuthenticated()).toBe(false);
	});

	it('saves cookies to disk', async () => {
		const store = new WeiboCookieStore();
		store.setCookies({SUB: 's', SUBP: 'p', 'XSRF-TOKEN': 'x'});

		await store.save();

		expect(mkdirMock).toHaveBeenCalledWith('D:/tmp/.zget-cli', {
			recursive: true,
		});
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/weibo-cookies.json',
			expect.stringContaining('"SUB": "s"'),
		);
	});

	it('clear() empties the cookie set', () => {
		const store = new WeiboCookieStore();
		store.setCookies({SUB: 's', SUBP: 'p'});
		expect(store.isAuthenticated()).toBe(true);
		store.clear();
		expect(store.isAuthenticated()).toBe(false);
		expect(store.getCookieString()).toBe('');
	});
});

const okResponse = (body: unknown, headers: Record<string, string[]> = {}) =>
	({
		ok: true,
		status: 200,
		statusText: 'OK',
		text: async () => JSON.stringify(body),
		json: async () => body,
		headers: {
			getSetCookie: () => Object.values(headers).flat(),
		},
	} as unknown as Response);

const setCookieResponse = (cookies: string[]) =>
	({
		ok: true,
		status: 200,
		statusText: 'OK',
		text: async () => '{"retcode":0}',
		json: async () => ({retcode: 0}),
		headers: {
			getSetCookie: () => cookies,
		},
	} as unknown as Response);

describe('performWeiboQrLogin', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('runs end-to-end QR flow: image → poll → SSO → cross-domain → bootstrap', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {
						qrid: 'QR-123',
						image: '//login.sina.com.cn/sso/qrcode/image/QR-123.png',
					},
				}),
			)
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {alt: 'ALT-TOK', signin_url: ''},
				}),
			)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				text: async () =>
					JSON.stringify({
						retcode: 0,
						uid: '999',
						crossDomainUrlList: [
							'https://weibo.com/sso/crossdomain.php?action=login&savestate=x',
							'https://login.sina.com.cn/cross.php?other=1',
						],
					}),
				json: async () => ({}),
				headers: {
					getSetCookie: () => ['SUB=sub-token; Path=/; Domain=.weibo.com'],
				},
			})
			.mockResolvedValueOnce(
				setCookieResponse(['SUBP=subp-token; Path=/; Domain=.weibo.com']),
			)
			.mockResolvedValueOnce(setCookieResponse([]))
			.mockResolvedValueOnce(
				setCookieResponse(['XSRF-TOKEN=xsrf-final; Path=/']),
			);
		vi.stubGlobal('fetch', fetchMock);

		const onQrReady = vi.fn();
		const onStatusChange = vi.fn();

		const loginPromise = performWeiboQrLogin({
			onQrReady,
			onStatusChange,
		});

		await vi.advanceTimersByTimeAsync(2000);
		const store = await loginPromise;

		expect(onQrReady).toHaveBeenCalledWith(
			'https://login.sina.com.cn/sso/qrcode/image/QR-123.png',
			'QR-123',
		);
		expect(onStatusChange).toHaveBeenCalledWith('confirmed');
		expect(store.isAuthenticated()).toBe(true);
		expect(store.getCsrf()).toBe('xsrf-final');
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/weibo-cookies.json',
			expect.stringContaining('"SUB": "sub-token"'),
		);
	});

	it('surfaces QR generation HTTP failures immediately', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ok: false, status: 502, statusText: 'Bad Gateway'});
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		await expect(
			performWeiboQrLogin({onQrReady: vi.fn(), onStatusChange}),
		).rejects.toThrow('QR code API failed: 502');
		expect(onStatusChange).toHaveBeenCalledWith('error', '获取二维码失败: 502');
	});

	it('rejects malformed QR payloads before polling starts', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(okResponse({retcode: 1, data: {}}));
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		await expect(
			performWeiboQrLogin({onQrReady: vi.fn(), onStatusChange}),
		).rejects.toThrow('QR code data invalid');
		expect(onStatusChange).toHaveBeenCalledWith('error', '二维码数据无效');
	});

	it('reports expired QR and stops polling', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {qrid: 'QR-1', image: '//x/y.png'},
				}),
			)
			.mockResolvedValueOnce(okResponse({retcode: 50_114_004}));
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		const loginPromise = performWeiboQrLogin({
			onQrReady: vi.fn(),
			onStatusChange,
		});
		const assertion =
			expect(loginPromise).rejects.toThrow('二维码已过期，请重新扫码');
		await vi.advanceTimersByTimeAsync(2000);
		await assertion;
		expect(onStatusChange).toHaveBeenCalledWith('expired');
	});

	it('reports cancellation', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {qrid: 'QR-1', image: '//x/y.png'},
				}),
			)
			.mockResolvedValueOnce(okResponse({retcode: 50_114_003}));
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		const loginPromise = performWeiboQrLogin({
			onQrReady: vi.fn(),
			onStatusChange,
		});
		const assertion = expect(loginPromise).rejects.toThrow('二维码登录已取消');
		await vi.advanceTimersByTimeAsync(2000);
		await assertion;
		expect(onStatusChange).toHaveBeenCalledWith('expired', '已取消登录');
	});

	it('handles waiting → scanned → confirmed transitions', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {qrid: 'QR-W', image: '//x/qrW.png'},
				}),
			)
			.mockResolvedValueOnce(okResponse({retcode: 50_114_001})) // Waiting
			.mockResolvedValueOnce(okResponse({retcode: 50_114_002})) // Scanned
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {alt: 'ALT-X'},
				}),
			)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				text: async () =>
					JSON.stringify({
						retcode: 0,
						uid: '1',
						crossDomainUrlList: ['https://weibo.com/sso/crossdomain.php?x=1'],
					}),
				json: async () => ({}),
				headers: {
					getSetCookie: () => ['SUB=s; Path=/'],
				},
			})
			.mockResolvedValueOnce(setCookieResponse(['SUBP=p; Path=/']))
			.mockResolvedValueOnce(setCookieResponse(['XSRF-TOKEN=xt; Path=/']));
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		const loginPromise = performWeiboQrLogin({
			onQrReady: vi.fn(),
			onStatusChange,
		});
		await vi.advanceTimersByTimeAsync(6000);
		const store = await loginPromise;

		expect(onStatusChange).toHaveBeenCalledWith('waiting');
		expect(onStatusChange).toHaveBeenCalledWith('scanned');
		expect(onStatusChange).toHaveBeenLastCalledWith('confirmed');
		expect(store.isAuthenticated()).toBe(true);
	});

	it('errors when cross-domain step does not yield SUB/SUBP', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {qrid: 'QR-N', image: '//x/qrN.png'},
				}),
			)
			.mockResolvedValueOnce(
				okResponse({retcode: 20_000_000, data: {alt: 'ALT-N'}}),
			)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				text: async () =>
					JSON.stringify({
						retcode: 0,
						uid: '2',
						crossDomainUrlList: ['https://weibo.com/sso/crossdomain.php?z=1'],
					}),
				json: async () => ({}),
				headers: {
					getSetCookie: () => [],
				},
			})
			.mockResolvedValueOnce(setCookieResponse([]));
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		const loginPromise = performWeiboQrLogin({
			onQrReady: vi.fn(),
			onStatusChange,
		});
		const assertion = expect(loginPromise).rejects.toThrow(
			'登录失败：未取得 SUB/SUBP cookie',
		);
		await vi.advanceTimersByTimeAsync(2000);
		await assertion;
		expect(onStatusChange).toHaveBeenCalledWith(
			'error',
			'未取得 SUB/SUBP cookie',
		);
	});

	it('unwraps JSONP-wrapped responses', async () => {
		// Confirms readJsonOrJsonp handles `STK && STK.callback({...})` style
		const jsonpResponse = (body: unknown) =>
			({
				ok: true,
				status: 200,
				statusText: 'OK',
				text: async () => `STK && STK.callback(${JSON.stringify(body)});`,
				json: async () => ({}),
				headers: {getSetCookie: () => []},
			} as unknown as Response);

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonpResponse({
					retcode: 20_000_000,
					data: {qrid: 'QR-J', image: '//x/qrJ.png'},
				}),
			)
			.mockResolvedValueOnce(
				jsonpResponse({retcode: 20_000_000, data: {alt: 'ALT-J'}}),
			)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				text: async () =>
					JSON.stringify({
						retcode: 0,
						uid: '3',
						crossDomainUrlList: ['https://weibo.com/sso/crossdomain.php?j=1'],
					}),
				json: async () => ({}),
				headers: {
					getSetCookie: () => ['SUB=jsub; Path=/'],
				},
			})
			.mockResolvedValueOnce(setCookieResponse(['SUBP=jsubp; Path=/']))
			.mockResolvedValueOnce(setCookieResponse([]));
		vi.stubGlobal('fetch', fetchMock);

		const onQrReady = vi.fn();
		const loginPromise = performWeiboQrLogin({
			onQrReady,
			onStatusChange: vi.fn(),
		});
		await vi.advanceTimersByTimeAsync(2000);
		const store = await loginPromise;
		expect(onQrReady).toHaveBeenCalledWith('https://x/qrJ.png', 'QR-J');
		expect(store.isAuthenticated()).toBe(true);
	});

	it('throws on QR polling timeout when no scan ever confirms', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {qrid: 'QR-T', image: '//x/qrT.png'},
				}),
			)
			.mockResolvedValue(okResponse({retcode: 50_114_001})); // Perpetually waiting
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		const loginPromise = performWeiboQrLogin({
			onQrReady: vi.fn(),
			onStatusChange,
		});
		const assertion = expect(loginPromise).rejects.toThrow('二维码登录超时');
		await vi.advanceTimersByTimeAsync(200_000);
		await assertion;
	});

	it('throws when SSO HTTP request fails', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {qrid: 'QR-H', image: '//x/qrH.png'},
				}),
			)
			.mockResolvedValueOnce(
				okResponse({retcode: 20_000_000, data: {alt: 'ALT-H'}}),
			)
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			});
		vi.stubGlobal('fetch', fetchMock);

		const loginPromise = performWeiboQrLogin({
			onQrReady: vi.fn(),
			onStatusChange: vi.fn(),
		});
		const assertion = expect(loginPromise).rejects.toThrow('SSO 登录失败: 500');
		await vi.advanceTimersByTimeAsync(2000);
		await assertion;
	});

	it('throws when SSO login returns an error retcode', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				okResponse({
					retcode: 20_000_000,
					data: {qrid: 'QR-S', image: '//x/qrS.png'},
				}),
			)
			.mockResolvedValueOnce(
				okResponse({retcode: 20_000_000, data: {alt: 'ALT-S'}}),
			)
			.mockResolvedValueOnce(okResponse({retcode: -1, msg: 'no good'}, {}));
		vi.stubGlobal('fetch', fetchMock);

		const loginPromise = performWeiboQrLogin({
			onQrReady: vi.fn(),
			onStatusChange: vi.fn(),
		});
		const assertion =
			expect(loginPromise).rejects.toThrow('SSO 登录返回数据无效');
		await vi.advanceTimersByTimeAsync(2000);
		await assertion;
	});
});
