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
	xhsCookieFile: 'D:/tmp/.zget-cli/xhs-cookies.json',
	xhsTokenFile: 'D:/tmp/.zget-cli/xhs-tokens.json',
}));

import {
	XhsCookieStore,
	XsecTokenCache,
} from '../../../source/core/auth/xhs-auth';

describe('XhsCookieStore', () => {
	beforeEach(() => {
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('loads, merges, and serializes cookies', async () => {
		readFileMock.mockResolvedValue(
			JSON.stringify({a1: 'cookie-a1', web_session: 'session-token'}),
		);

		const store = new XhsCookieStore();
		await store.load();
		store.setCookies({gid: 'gid-token'});
		store.parseCookieString('webId=123; complex=a=b');

		expect(store.isAuthenticated()).toBe(true);
		expect(store.getCookie('gid')).toBe('gid-token');
		expect(store.getCookieString()).toContain('a1=cookie-a1');
		expect(store.getCookieString()).toContain('complex=a=b');

		await store.save();
		expect(mkdirMock).toHaveBeenCalledWith('D:/tmp/.zget-cli', {
			recursive: true,
		});
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/xhs-cookies.json',
			expect.stringContaining('"gid": "gid-token"'),
		);
	});

	it('clears state when requested', () => {
		const store = new XhsCookieStore();
		store.setCookies({a1: 'a', web_session: 'b'});
		expect(store.isAuthenticated()).toBe(true);

		store.clear();
		expect(store.isAuthenticated()).toBe(false);
		expect(store.getCookieString()).toBe('');
	});

	it('tolerates missing cookie files', async () => {
		readFileMock.mockRejectedValue(new Error('missing'));

		const store = new XhsCookieStore();
		await expect(store.load()).resolves.toBeUndefined();
		expect(store.isAuthenticated()).toBe(false);
	});
});

describe('XsecTokenCache', () => {
	beforeEach(() => {
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('loads and returns non-expired token entries', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-01T00:00:00Z'));
		readFileMock.mockResolvedValue(
			JSON.stringify({
				note: {token: 'cached-token', timestamp: Date.now()},
			}),
		);

		const cache = new XsecTokenCache();
		await cache.load();

		expect(cache.get('note')).toBe('cached-token');
	});

	it('expires stale token entries and persists updates', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-01T00:00:00Z'));

		const cache = new XsecTokenCache();
		cache.set('note', 'fresh-token');
		await cache.save();

		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/xhs-tokens.json',
			expect.stringContaining('"fresh-token"'),
		);

		vi.setSystemTime(new Date('2026-04-01T00:31:00Z'));
		expect(cache.get('note')).toBeUndefined();
	});

	it('returns undefined for missing cache entries', () => {
		const cache = new XsecTokenCache();
		expect(cache.get('missing')).toBeUndefined();
	});
});
