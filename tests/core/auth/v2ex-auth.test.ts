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
	v2exTokenFile: 'D:/tmp/.zget-cli/v2ex-token.json',
}));

import {V2exTokenStore} from '../../../source/core/auth/v2ex-auth';

describe('V2exTokenStore', () => {
	beforeEach(() => {
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('load() reads the token from disk', async () => {
		readFileMock.mockResolvedValueOnce(JSON.stringify({token: 'pat-abc'}));
		const store = new V2exTokenStore();
		await store.load();
		expect(store.isAuthenticated()).toBe(true);
		expect(store.getToken()).toBe('pat-abc');
	});

	it('load() silently tolerates a missing file', async () => {
		readFileMock.mockRejectedValueOnce(new Error('ENOENT'));
		const store = new V2exTokenStore();
		await expect(store.load()).resolves.toBeUndefined();
		expect(store.isAuthenticated()).toBe(false);
	});

	it('save() persists the token as JSON', async () => {
		const store = new V2exTokenStore();
		store.setToken('pat-xyz');
		await store.save();
		expect(mkdirMock).toHaveBeenCalled();
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/v2ex-token.json',
			expect.stringContaining('pat-xyz'),
		);
	});

	it('setToken trims whitespace and clear empties the store', () => {
		const store = new V2exTokenStore();
		store.setToken('  pat-trim  ');
		expect(store.getToken()).toBe('pat-trim');
		store.clear();
		expect(store.isAuthenticated()).toBe(false);
		expect(store.getToken()).toBeUndefined();
	});

	it('empty token strings are treated as unauthenticated', () => {
		const store = new V2exTokenStore();
		store.setToken('');
		expect(store.isAuthenticated()).toBe(false);
		expect(store.getToken()).toBeUndefined();
	});
});
