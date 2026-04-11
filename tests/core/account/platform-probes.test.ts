import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
	zhihuLoadMock,
	zhihuAuthenticatedMock,
	xLoadMock,
	xConfiguredMock,
	xhsLoadMock,
	xhsAuthenticatedMock,
	biliLoadMock,
	biliAuthenticatedMock,
	aiLoadMock,
	aiConfiguredMock,
} = vi.hoisted(() => ({
	zhihuLoadMock: vi.fn(),
	zhihuAuthenticatedMock: vi.fn(),
	xLoadMock: vi.fn(),
	xConfiguredMock: vi.fn(),
	xhsLoadMock: vi.fn(),
	xhsAuthenticatedMock: vi.fn(),
	biliLoadMock: vi.fn(),
	biliAuthenticatedMock: vi.fn(),
	aiLoadMock: vi.fn(),
	aiConfiguredMock: vi.fn(),
}));

vi.mock('../../../source/core/auth/cookie-store', () => ({
	CookieStore: class {
		load = zhihuLoadMock;
		isAuthenticated = zhihuAuthenticatedMock;
	},
}));

vi.mock('../../../source/core/auth/x-auth', () => ({
	XCredentialStore: class {
		load = xLoadMock;
		isConfigured = xConfiguredMock;
	},
}));

vi.mock('../../../source/core/auth/xhs-auth', () => ({
	XhsCookieStore: class {
		load = xhsLoadMock;
		isAuthenticated = xhsAuthenticatedMock;
	},
}));

vi.mock('../../../source/core/auth/bili-auth', () => ({
	BiliCookieStore: class {
		load = biliLoadMock;
		isAuthenticated = biliAuthenticatedMock;
	},
}));

vi.mock('../../../source/core/ai/ai-config', () => ({
	AiConfigStore: class {
		load = aiLoadMock;
		isConfigured = aiConfiguredMock;
	},
}));

import {
	probeAiLocalState,
	probeBiliLocalState,
	probeTwitterLocalState,
	probeXhsLocalState,
	probeZhihuLocalState,
} from '../../../source/core/account/platform-probes';

describe('platform local probes', () => {
	const originalEnv = {...process.env};

	beforeEach(() => {
		process.env = {...originalEnv};
		delete process.env.X_API_KEY;
		delete process.env.X_API_SECRET;
		delete process.env.X_BEARER_TOKEN;
		delete process.env.X_ACCESS_TOKEN;
		delete process.env.X_ACCESS_TOKEN_SECRET;
		delete process.env.AI_PROVIDER;
		delete process.env.OPENAI_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.DEEPSEEK_API_KEY;
		delete process.env.AI_API_KEY;

		zhihuLoadMock.mockReset().mockResolvedValue(false);
		zhihuAuthenticatedMock.mockReset().mockReturnValue(false);
		xLoadMock.mockReset().mockResolvedValue(undefined);
		xConfiguredMock.mockReset().mockReturnValue(false);
		xhsLoadMock.mockReset().mockResolvedValue(undefined);
		xhsAuthenticatedMock.mockReset().mockReturnValue(false);
		biliLoadMock.mockReset().mockResolvedValue(undefined);
		biliAuthenticatedMock.mockReset().mockReturnValue(false);
		aiLoadMock.mockReset().mockResolvedValue(undefined);
		aiConfiguredMock.mockReset().mockReturnValue(false);
	});

	it('returns missing for Zhihu when no authenticated cookies are available', async () => {
		await expect(probeZhihuLocalState()).resolves.toEqual({
			platform: 'zhihu',
			status: 'missing',
			credentialSource: 'none',
		});
	});

	it('returns detected with cookie source for authenticated XHS cookies', async () => {
		xhsAuthenticatedMock.mockReturnValue(true);

		await expect(probeXhsLocalState()).resolves.toEqual({
			platform: 'xhs',
			status: 'detected',
			credentialSource: 'cookies',
		});
	});

	it('returns detected with cookie source for authenticated Bilibili cookies', async () => {
		biliAuthenticatedMock.mockReturnValue(true);

		await expect(probeBiliLocalState()).resolves.toEqual({
			platform: 'bili',
			status: 'detected',
			credentialSource: 'cookies',
		});
	});

	it('returns detected with env source for X credentials loaded from environment', async () => {
		process.env.X_API_KEY = 'env-key';
		process.env.X_API_SECRET = 'env-secret';
		process.env.X_BEARER_TOKEN = 'env-bearer';
		process.env.X_ACCESS_TOKEN = 'env-access';
		process.env.X_ACCESS_TOKEN_SECRET = 'env-access-secret';
		xConfiguredMock.mockReturnValue(true);

		await expect(probeTwitterLocalState()).resolves.toEqual({
			platform: 'x',
			status: 'detected',
			credentialSource: 'env',
		});
	});

	it('returns detected with file source for saved X credentials', async () => {
		xConfiguredMock.mockReturnValue(true);

		await expect(probeTwitterLocalState()).resolves.toEqual({
			platform: 'x',
			status: 'detected',
			credentialSource: 'file',
		});
	});

	it('returns detected with env source for AI configuration from environment', async () => {
		process.env.OPENAI_API_KEY = 'sk-openai';
		aiConfiguredMock.mockReturnValue(true);

		await expect(probeAiLocalState()).resolves.toEqual({
			platform: 'ai',
			status: 'detected',
			credentialSource: 'env',
		});
	});
});
