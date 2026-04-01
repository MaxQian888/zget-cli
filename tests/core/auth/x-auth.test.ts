import {Buffer} from 'node:buffer';
import process from 'node:process';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {
	createHmacMock,
	randomBytesMock,
	readFileMock,
	writeFileMock,
	mkdirMock,
} = vi.hoisted(() => {
	const updateMock = vi.fn().mockReturnThis();
	return {
		createHmacMock: vi.fn(() => ({
			update: updateMock,
			digest: vi.fn(() => 'signature=='),
		})),
		randomBytesMock: vi.fn(() => Buffer.from('0123456789abcdef')),
		readFileMock: vi.fn(),
		writeFileMock: vi.fn(),
		mkdirMock: vi.fn(),
	};
});

vi.mock('node:crypto', () => ({
	createHmac: createHmacMock,
	randomBytes: randomBytesMock,
}));

vi.mock('node:fs/promises', () => ({
	readFile: readFileMock,
	writeFile: writeFileMock,
	mkdir: mkdirMock,
}));

vi.mock('../../../source/core/utils/config', () => ({
	xCredentialsFile: 'D:/tmp/.zget-cli/x-credentials.json',
}));

import {
	generateOAuthHeader,
	XCredentialStore,
} from '../../../source/core/auth/x-auth';

describe('X auth helpers', () => {
	const originalEnv = {...process.env};

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-01T00:00:00Z'));
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
		createHmacMock.mockClear();
		randomBytesMock.mockClear();
		process.env = {...originalEnv};
		delete process.env.X_API_KEY;
		delete process.env.X_API_SECRET;
		delete process.env.X_BEARER_TOKEN;
		delete process.env.X_ACCESS_TOKEN;
		delete process.env.X_ACCESS_TOKEN_SECRET;
	});

	afterEach(() => {
		process.env = {...originalEnv};
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('builds an OAuth 1.0a header with encoded parameters and a signature', () => {
		const header = generateOAuthHeader(
			'POST',
			'https://api.x.com/2/tweets',
			{text: 'hello world', quote_tweet_id: '42'},
			{
				apiKey: 'api-key',
				apiSecret: 'api-secret',
				bearerToken: 'bearer-token',
				accessToken: 'access-token',
				accessTokenSecret: 'access-secret',
			},
		);

		expect(header).toContain('OAuth ');
		expect(header).toContain('oauth_consumer_key="api-key"');
		expect(header).toContain('oauth_nonce="30313233343536373839616263646566"');
		expect(header).toContain('oauth_signature="signature%3D%3D"');
		expect(createHmacMock).toHaveBeenCalledWith(
			'sha1',
			'api-secret&access-secret',
		);
	});

	it('loads credentials from the environment before reading disk', async () => {
		process.env.X_API_KEY = 'env-key';
		process.env.X_API_SECRET = 'env-secret';
		process.env.X_BEARER_TOKEN = 'env-bearer';
		process.env.X_ACCESS_TOKEN = 'env-access';
		process.env.X_ACCESS_TOKEN_SECRET = 'env-access-secret';

		const store = new XCredentialStore();
		await store.load();

		expect(readFileMock).not.toHaveBeenCalled();
		expect(store.isConfigured()).toBe(true);
		expect(store.getBearerToken()).toBe('env-bearer');
		expect(store.getCredentials()).toEqual({
			apiKey: 'env-key',
			apiSecret: 'env-secret',
			bearerToken: 'env-bearer',
			accessToken: 'env-access',
			accessTokenSecret: 'env-access-secret',
		});
	});

	it('falls back to saved credentials on disk and persists updates', async () => {
		readFileMock.mockResolvedValue(
			JSON.stringify({
				apiKey: 'disk-key',
				apiSecret: 'disk-secret',
				bearerToken: 'disk-bearer',
				accessToken: 'disk-access',
				accessTokenSecret: 'disk-access-secret',
			}),
		);

		const store = new XCredentialStore();
		await store.load();
		expect(store.getBearerToken()).toBe('disk-bearer');

		await store.save({
			apiKey: 'saved-key',
			apiSecret: 'saved-secret',
			bearerToken: 'saved-bearer',
			accessToken: 'saved-access',
			accessTokenSecret: 'saved-access-secret',
		});

		expect(mkdirMock).toHaveBeenCalledWith('D:/tmp/.zget-cli', {
			recursive: true,
		});
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/x-credentials.json',
			expect.stringContaining('"apiKey": "saved-key"'),
		);
	});

	it('throws a clear error when credentials are missing', () => {
		const store = new XCredentialStore();

		expect(() => store.getCredentials()).toThrow(
			'X API credentials not configured. Run "zget x login" or set environment variables.',
		);
	});
});
