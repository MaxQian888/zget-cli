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
	biliCookieFile: 'D:/tmp/.zget-cli/bili-cookies.json',
}));

import {
	BiliCookieStore,
	performBiliQrLogin,
} from '../../../source/core/auth/bili-auth';

describe('BiliCookieStore', () => {
	beforeEach(() => {
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('loads, parses, and exposes bili auth cookies', async () => {
		readFileMock.mockResolvedValue(
			JSON.stringify({
				SESSDATA: 'sess',
				bili_jct: 'csrf',
				DedeUserID: '1000',
			}),
		);

		const store = new BiliCookieStore();
		await store.load();
		store.parseCookieString('sid=1; extra=a=b');

		expect(store.isAuthenticated()).toBe(true);
		expect(store.getCsrf()).toBe('csrf');
		expect(store.getUserId()).toBe('1000');
		expect(store.getCookie('extra')).toBe('a=b');
		expect(store.getCookieString()).toContain('SESSDATA=sess');
	});

	it('saves cookies to disk', async () => {
		const store = new BiliCookieStore();
		store.setCookies({SESSDATA: 'sess', bili_jct: 'csrf'});

		await store.save();

		expect(mkdirMock).toHaveBeenCalledWith('D:/tmp/.zget-cli', {
			recursive: true,
		});
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/bili-cookies.json',
			expect.stringContaining('"SESSDATA": "sess"'),
		);
	});
});

describe('performBiliQrLogin', () => {
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

	it('polls until login is confirmed and persists cookies', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					code: 0,
					data: {
						url: 'https://qr.example.com/login',
						qrcode_key: 'qr-key',
					},
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				headers: {
					getSetCookie: () => [
						'SESSDATA=sess-token; Path=/',
						'bili_jct=csrf; Path=/',
					],
				},
				json: async () => ({
					code: 0,
					data: {
						code: 0,
						url: 'https://www.bilibili.com/callback?DedeUserID=42',
					},
				}),
			});
		vi.stubGlobal('fetch', fetchMock);

		const onQrReady = vi.fn();
		const onStatusChange = vi.fn();
		const loginPromise = performBiliQrLogin({onQrReady, onStatusChange});

		await vi.advanceTimersByTimeAsync(2000);
		const store = await loginPromise;

		expect(onQrReady).toHaveBeenCalledWith('https://qr.example.com/login');
		expect(onStatusChange).toHaveBeenNthCalledWith(1, 'waiting');
		expect(onStatusChange).toHaveBeenLastCalledWith('confirmed');
		expect(store.isAuthenticated()).toBe(true);
		expect(store.getUserId()).toBe('42');
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/bili-cookies.json',
			expect.stringContaining('"SESSDATA": "sess-token"'),
		);
	});

	it('surfaces QR generation failures immediately', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 502,
		});
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();

		await expect(
			performBiliQrLogin({
				onQrReady: vi.fn(),
				onStatusChange,
			}),
		).rejects.toThrow('QR code API failed: 502');
		expect(onStatusChange).toHaveBeenCalledWith('error', '获取二维码失败: 502');
	});

	it('rejects invalid QR payloads before polling starts', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				code: -1,
				data: undefined,
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();

		await expect(
			performBiliQrLogin({
				onQrReady: vi.fn(),
				onStatusChange,
			}),
		).rejects.toThrow('QR code data invalid');
		expect(onStatusChange).toHaveBeenCalledWith('error', '二维码数据无效');
	});

	it('reports expired QR codes from polling responses', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					code: 0,
					data: {
						url: 'https://qr.example.com/login',
						qrcode_key: 'qr-key',
					},
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				headers: {
					getSetCookie: () => [],
				},
				json: async () => ({
					code: 0,
					data: {
						code: 86_038,
					},
				}),
			});
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		const loginPromise = performBiliQrLogin({
			onQrReady: vi.fn(),
			onStatusChange,
		});
		const assertion =
			expect(loginPromise).rejects.toThrow('二维码已过期，请重新扫码');

		await vi.advanceTimersByTimeAsync(2000);
		await assertion;
		expect(onStatusChange).toHaveBeenCalledWith('expired');
	});

	it('handles scanned and waiting statuses before confirming login', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					code: 0,
					data: {
						url: 'https://qr.example.com/login',
						qrcode_key: 'qr-key',
					},
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				headers: {getSetCookie: () => []},
				json: async () => ({
					code: 0,
					data: {code: 86_090},
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				headers: {getSetCookie: () => []},
				json: async () => ({
					code: 0,
					data: {code: 86_101},
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				headers: {
					getSetCookie: () => [
						'SESSDATA=done; Path=/',
						'bili_jct=csrf; Path=/',
					],
				},
				json: async () => ({
					code: 0,
					data: {
						code: 0,
						url: 'https://www.bilibili.com/callback?DedeUserID=7',
					},
				}),
			});
		vi.stubGlobal('fetch', fetchMock);

		const onStatusChange = vi.fn();
		const loginPromise = performBiliQrLogin({
			onQrReady: vi.fn(),
			onStatusChange,
		});

		await vi.advanceTimersByTimeAsync(6000);
		const store = await loginPromise;

		expect(onStatusChange).toHaveBeenCalledWith('waiting');
		expect(onStatusChange).toHaveBeenCalledWith('scanned');
		expect(onStatusChange).toHaveBeenLastCalledWith('confirmed');
		expect(store.getUserId()).toBe('7');
	});

	it('retries after transient poll failures and empty poll payloads', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					code: 0,
					data: {
						url: 'https://qr.example.com/login',
						qrcode_key: 'qr-key',
					},
				}),
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 503,
				headers: {getSetCookie: () => []},
			})
			.mockResolvedValueOnce({
				ok: true,
				headers: {getSetCookie: () => []},
				json: async () => ({
					code: 0,
					data: undefined,
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				headers: {
					getSetCookie: () => [
						'SESSDATA=retry; Path=/',
						'bili_jct=csrf; Path=/',
					],
				},
				json: async () => ({
					code: 0,
					data: {
						code: 0,
						url: 'https://www.bilibili.com/callback?DedeUserID=11',
					},
				}),
			});
		vi.stubGlobal('fetch', fetchMock);

		const loginPromise = performBiliQrLogin({
			onQrReady: vi.fn(),
			onStatusChange: vi.fn(),
		});

		await vi.advanceTimersByTimeAsync(6000);
		const store = await loginPromise;
		expect(store.getUserId()).toBe('11');
	});
});
