import {Buffer} from 'node:buffer';
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
	redditCredentialsFile: 'D:/tmp/.zget-cli/reddit-credentials.json',
}));

import {
	RedditCredentialStore,
	performRedditPasswordLogin,
	refreshRedditAccessToken,
} from '../../../source/core/auth/reddit-auth';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

describe('RedditCredentialStore', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('load() reads creds JSON when present', async () => {
		readFileMock.mockResolvedValueOnce(
			JSON.stringify({
				clientId: 'cid',
				clientSecret: 'sec',
				username: 'alice',
				accessToken: 'tok',
			}),
		);
		const store = new RedditCredentialStore();
		await store.load();
		expect(store.isAuthenticated()).toBe(true);
		expect(store.getUsername()).toBe('alice');
		expect(store.getAccessToken()).toBe('tok');
	});

	it('load() silently tolerates a missing file', async () => {
		readFileMock.mockRejectedValueOnce(new Error('ENOENT'));
		const store = new RedditCredentialStore();
		await expect(store.load()).resolves.toBeUndefined();
		expect(store.isAuthenticated()).toBe(false);
	});

	it('isAuthenticated requires all of clientId/secret/username/accessToken', () => {
		const store = new RedditCredentialStore();
		store.setCredentials({clientId: 'a', clientSecret: 'b', username: 'u'});
		expect(store.isAuthenticated()).toBe(false);
		store.setCredentials({accessToken: 't'});
		expect(store.isAuthenticated()).toBe(true);
	});

	it('isAccessTokenExpired is true with no tokenExpiresAt', () => {
		const store = new RedditCredentialStore();
		expect(store.isAccessTokenExpired()).toBe(true);
	});

	it('isAccessTokenExpired is false when expiry is far in the future', () => {
		const store = new RedditCredentialStore();
		store.setCredentials({tokenExpiresAt: Date.now() + 600_000});
		expect(store.isAccessTokenExpired()).toBe(false);
	});

	it('clear() resets credentials', () => {
		const store = new RedditCredentialStore();
		store.setCredentials({
			clientId: 'a',
			clientSecret: 'b',
			username: 'u',
			accessToken: 't',
		});
		expect(store.isAuthenticated()).toBe(true);
		store.clear();
		expect(store.isAuthenticated()).toBe(false);
	});
});

describe('performRedditPasswordLogin', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('exchanges credentials for an access token and saves them', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				access_token: 'AT',
				refresh_token: 'RT',
				expires_in: 3600,
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const store = await performRedditPasswordLogin({
			clientId: 'cid',
			clientSecret: 'sec',
			username: 'alice',
			password: 'pw',
		});

		expect(store.getAccessToken()).toBe('AT');
		expect(store.isAuthenticated()).toBe(true);
		expect(writeFileMock).toHaveBeenCalled();
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const headers = init.headers as Record<string, string>;
		// Verify the Basic auth header contains a base64 of "cid:sec".
		expect(headers.Authorization).toBe(
			'Basic ' + Buffer.from('cid:sec').toString('base64'),
		);
	});

	it('throws when token endpoint returns 401', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 401}));
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			performRedditPasswordLogin({
				clientId: 'cid',
				clientSecret: 'sec',
				username: 'alice',
				password: 'pw',
			}),
		).rejects.toThrow(/Reddit token exchange/);
	});

	it('throws when response is 200 but contains an error field', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({error: 'invalid_grant'}));
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			performRedditPasswordLogin({
				clientId: 'cid',
				clientSecret: 'sec',
				username: 'alice',
				password: 'pw',
			}),
		).rejects.toThrow(/Reddit token error/);
	});
});

describe('refreshRedditAccessToken', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		readFileMock.mockReset();
		writeFileMock.mockReset();
	});

	it('uses refresh_token grant when available', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({access_token: 'NEW', expires_in: 3600}));
		vi.stubGlobal('fetch', fetchMock);

		const store = new RedditCredentialStore();
		store.setCredentials({
			clientId: 'c',
			clientSecret: 's',
			username: 'u',
			refreshToken: 'RT',
		});
		await refreshRedditAccessToken(store);
		expect(store.getAccessToken()).toBe('NEW');
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(String(init.body)).toContain('grant_type=refresh_token');
	});

	it('falls back to client_credentials grant when no refresh token + no password', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({access_token: 'CC', expires_in: 3600}));
		vi.stubGlobal('fetch', fetchMock);

		const store = new RedditCredentialStore();
		store.setCredentials({clientId: 'c', clientSecret: 's', username: 'u'});
		await refreshRedditAccessToken(store);
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(String(init.body)).toContain('grant_type=client_credentials');
	});

	it('uses password grant when a sidecar password is passed', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({access_token: 'PW', expires_in: 3600}));
		vi.stubGlobal('fetch', fetchMock);

		const store = new RedditCredentialStore();
		store.setCredentials({clientId: 'c', clientSecret: 's', username: 'u'});
		await refreshRedditAccessToken(store, 'sidecar');
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(String(init.body)).toContain('grant_type=password');
		expect(String(init.body)).toContain('password=sidecar');
	});

	it('throws when client_id/secret is missing', async () => {
		const store = new RedditCredentialStore();
		await expect(refreshRedditAccessToken(store)).rejects.toThrow(
			/credentials missing/i,
		);
	});

	it('throws when refresh response is not OK', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 500}));
		vi.stubGlobal('fetch', fetchMock);

		const store = new RedditCredentialStore();
		store.setCredentials({clientId: 'c', clientSecret: 's', username: 'u'});
		await expect(refreshRedditAccessToken(store)).rejects.toThrow(
			/Reddit refresh failed/,
		);
	});
});
