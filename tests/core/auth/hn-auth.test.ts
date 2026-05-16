import {beforeEach, describe, expect, it, vi} from 'vitest';

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
	hnCookieFile: 'D:/tmp/.zget-cli/hn-cookies.json',
}));

import {HnCookieStore} from '../../../source/core/auth/hn-auth';

describe('HnCookieStore', () => {
	beforeEach(() => {
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('load() reads cookie JSON when present', async () => {
		readFileMock.mockResolvedValueOnce(JSON.stringify({user: 'alice&xyz'}));
		const store = new HnCookieStore();
		await store.load();
		expect(store.isAuthenticated()).toBe(true);
		expect(store.getUsername()).toBe('alice');
	});

	it('load() silently tolerates a missing file', async () => {
		readFileMock.mockRejectedValueOnce(new Error('ENOENT'));
		const store = new HnCookieStore();
		await expect(store.load()).resolves.toBeUndefined();
		expect(store.isAuthenticated()).toBe(false);
	});

	it('save() writes JSON to the configured path', async () => {
		const store = new HnCookieStore();
		store.setCookies({user: 'bob&tok'});
		await store.save();
		expect(mkdirMock).toHaveBeenCalled();
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/hn-cookies.json',
			expect.stringContaining('bob&tok'),
		);
	});

	it('parseCookieString accepts a raw "user=..." header', () => {
		const store = new HnCookieStore();
		store.parseCookieString('user=alice&zzz; theme=dark');
		expect(store.getCookieString()).toBe('user=alice&zzz');
		expect(store.getUsername()).toBe('alice');
	});

	it('getCookieString returns empty string when not authenticated', () => {
		const store = new HnCookieStore();
		expect(store.getCookieString()).toBe('');
	});

	it('clear() drops the user cookie', () => {
		const store = new HnCookieStore();
		store.setCookies({user: 'x&y'});
		expect(store.isAuthenticated()).toBe(true);
		store.clear();
		expect(store.isAuthenticated()).toBe(false);
		expect(store.getUsername()).toBeUndefined();
	});

	it('getUsername returns undefined when user lacks the &<token> suffix', () => {
		const store = new HnCookieStore();
		store.setCookies({user: 'malformed'});
		expect(store.getUsername()).toBeUndefined();
	});
});
