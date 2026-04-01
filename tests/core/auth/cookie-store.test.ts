import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {
	existsSyncMock,
	readFileMock,
	writeFileMock,
	chmodMock,
	ensureConfigDirMock,
} = vi.hoisted(() => ({
	existsSyncMock: vi.fn(),
	readFileMock: vi.fn(),
	writeFileMock: vi.fn(),
	chmodMock: vi.fn(),
	ensureConfigDirMock: vi.fn(),
}));

vi.mock('node:fs', () => ({
	existsSync: existsSyncMock,
}));

vi.mock('node:fs/promises', () => ({
	readFile: readFileMock,
	writeFile: writeFileMock,
	chmod: chmodMock,
}));

vi.mock('../../../source/core/utils/config', () => ({
	cookieFile: 'D:/tmp/.zget-cli/cookies.json',
	ensureConfigDir: ensureConfigDirMock,
}));

import {CookieStore} from '../../../source/core/auth/cookie-store';

describe('CookieStore', () => {
	beforeEach(() => {
		existsSyncMock.mockReset();
		readFileMock.mockReset();
		writeFileMock.mockReset();
		chmodMock.mockReset();
		ensureConfigDirMock.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns false when no cookie file exists', async () => {
		existsSyncMock.mockReturnValue(false);

		const store = new CookieStore();
		await expect(store.load()).resolves.toBe(false);
		expect(store.isAuthenticated()).toBe(false);
	});

	it('loads and exposes cookie helpers from disk', async () => {
		existsSyncMock.mockReturnValue(true);
		readFileMock.mockResolvedValue(
			JSON.stringify({
				cookies: {
					z_c0: 'z-token',
					_xsrf: 'xsrf-token',
					d_c0: 'd-token',
				},
			}),
		);

		const store = new CookieStore();
		await expect(store.load()).resolves.toBe(true);

		expect(store.isAuthenticated()).toBe(true);
		expect(store.get('z_c0')).toBe('z-token');
		expect(store.getXsrfToken()).toBe('xsrf-token');
		expect(store.getAll()).toEqual({
			z_c0: 'z-token',
			_xsrf: 'xsrf-token',
			d_c0: 'd-token',
		});
		expect(store.getCookieString()).toContain('z_c0=z-token');
	});

	it('parses cookie strings and clears them again', () => {
		const store = new CookieStore();
		store.parseCookieString('z_c0=z; invalid; _xsrf=x; d_c0=d; complex=a=b=c');

		expect(store.getCookieString()).toContain('complex=a=b=c');
		expect(store.isAuthenticated()).toBe(true);

		store.clear();
		expect(store.getAll()).toEqual({});
		expect(store.isAuthenticated()).toBe(false);
	});

	it('returns false when cookie files are unreadable', async () => {
		existsSyncMock.mockReturnValue(true);
		readFileMock.mockRejectedValue(new Error('corrupted'));

		const store = new CookieStore();
		await expect(store.load()).resolves.toBe(false);
	});

	it('saves cookies and ignores chmod failures on unsupported platforms', async () => {
		chmodMock.mockRejectedValue(new Error('unsupported'));

		const store = new CookieStore();
		store.set('z_c0', 'z');
		store.set('_xsrf', 'x');
		store.set('d_c0', 'd');

		await store.save();

		expect(ensureConfigDirMock).toHaveBeenCalledTimes(1);
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/cookies.json',
			expect.stringContaining('"z_c0": "z"'),
			'utf8',
		);
		expect(chmodMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/cookies.json',
			0o600,
		);
	});
});
