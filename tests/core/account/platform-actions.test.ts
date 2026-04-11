import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
	getPlatformAccountStateMock,
	zhihuLoadMock,
	zhihuClearMock,
	zhihuSaveMock,
	xhsLoadMock,
	xhsClearMock,
	xhsSaveMock,
	biliLoadMock,
	biliClearMock,
	biliSaveMock,
	rmMock,
} = vi.hoisted(() => ({
	getPlatformAccountStateMock: vi.fn(),
	zhihuLoadMock: vi.fn(),
	zhihuClearMock: vi.fn(),
	zhihuSaveMock: vi.fn(),
	xhsLoadMock: vi.fn(),
	xhsClearMock: vi.fn(),
	xhsSaveMock: vi.fn(),
	biliLoadMock: vi.fn(),
	biliClearMock: vi.fn(),
	biliSaveMock: vi.fn(),
	rmMock: vi.fn(),
}));

vi.mock('../../../source/core/account/account-status', () => ({
	getPlatformAccountState: getPlatformAccountStateMock,
}));

vi.mock('../../../source/core/auth/cookie-store', () => ({
	CookieStore: class {
		load = zhihuLoadMock;
		clear = zhihuClearMock;
		save = zhihuSaveMock;
	},
}));

vi.mock('../../../source/core/auth/xhs-auth', () => ({
	XhsCookieStore: class {
		load = xhsLoadMock;
		clear = xhsClearMock;
		save = xhsSaveMock;
	},
}));

vi.mock('../../../source/core/auth/bili-auth', () => ({
	BiliCookieStore: class {
		load = biliLoadMock;
		clear = biliClearMock;
		save = biliSaveMock;
	},
}));

vi.mock('node:fs/promises', () => ({
	rm: rmMock,
}));

vi.mock('../../../source/core/utils/config', () => ({
	xCredentialsFile: 'D:/tmp/.zget-cli/x-credentials.json',
	xhsTokenFile: 'D:/tmp/.zget-cli/xhs-tokens.json',
	aiConfigFile: 'D:/tmp/.zget-cli/ai-config.json',
}));

import {runPlatformAction} from '../../../source/core/account/platform-actions';

describe('platform account actions', () => {
	const originalEnv = {...process.env};

	beforeEach(() => {
		process.env = {...originalEnv};
		delete process.env.X_API_KEY;
		delete process.env.X_API_SECRET;
		delete process.env.X_BEARER_TOKEN;
		delete process.env.X_ACCESS_TOKEN;
		delete process.env.X_ACCESS_TOKEN_SECRET;
		delete process.env.OPENAI_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.DEEPSEEK_API_KEY;
		delete process.env.AI_API_KEY;

		getPlatformAccountStateMock.mockReset().mockResolvedValue({
			platform: 'zhihu',
			status: 'missing',
			credentialSource: 'none',
		});
		zhihuLoadMock.mockReset().mockResolvedValue(false);
		zhihuClearMock.mockReset();
		zhihuSaveMock.mockReset().mockResolvedValue(undefined);
		xhsLoadMock.mockReset().mockResolvedValue(undefined);
		xhsClearMock.mockReset();
		xhsSaveMock.mockReset().mockResolvedValue(undefined);
		biliLoadMock.mockReset().mockResolvedValue(undefined);
		biliClearMock.mockReset();
		biliSaveMock.mockReset().mockResolvedValue(undefined);
		rmMock.mockReset().mockResolvedValue(undefined);
	});

	it('rechecks by delegating to the latest platform snapshot', async () => {
		getPlatformAccountStateMock.mockResolvedValue({
			platform: 'x',
			status: 'ready',
			credentialSource: 'env',
		});

		await expect(runPlatformAction('x', 'recheck')).resolves.toMatchObject({
			ok: true,
			action: 'recheck',
			state: {
				platform: 'x',
				status: 'ready',
			},
		});
		expect(getPlatformAccountStateMock).toHaveBeenCalledWith('x');
	});

	it('clears Zhihu cookies through the cookie store and returns the refreshed state', async () => {
		getPlatformAccountStateMock.mockResolvedValue({
			platform: 'zhihu',
			status: 'missing',
			credentialSource: 'none',
		});

		await expect(runPlatformAction('zhihu', 'clear')).resolves.toMatchObject({
			ok: true,
			action: 'clear',
			state: {
				platform: 'zhihu',
				status: 'missing',
			},
		});
		expect(zhihuClearMock).toHaveBeenCalledTimes(1);
		expect(zhihuSaveMock).toHaveBeenCalledTimes(1);
	});

	it('does not destructively clear env-backed X credentials', async () => {
		process.env.X_API_KEY = 'env-key';
		process.env.X_API_SECRET = 'env-secret';
		process.env.X_BEARER_TOKEN = 'env-bearer';
		process.env.X_ACCESS_TOKEN = 'env-access';
		process.env.X_ACCESS_TOKEN_SECRET = 'env-access-secret';

		await expect(runPlatformAction('x', 'clear')).resolves.toMatchObject({
			ok: false,
			action: 'clear',
			message: 'X credentials are coming from environment variables.',
		});
		expect(rmMock).not.toHaveBeenCalled();
	});

	it('clears file-backed X credentials by removing the saved credentials file', async () => {
		getPlatformAccountStateMock.mockResolvedValue({
			platform: 'x',
			status: 'missing',
			credentialSource: 'none',
		});

		await expect(runPlatformAction('x', 'clear')).resolves.toMatchObject({
			ok: true,
			action: 'clear',
			state: {
				platform: 'x',
				status: 'missing',
			},
		});
		expect(rmMock).toHaveBeenCalledWith('D:/tmp/.zget-cli/x-credentials.json', {
			force: true,
		});
	});

	it('does not destructively clear env-backed AI config', async () => {
		process.env.OPENAI_API_KEY = 'sk-openai';

		await expect(runPlatformAction('ai', 'clear')).resolves.toMatchObject({
			ok: false,
			action: 'clear',
			message: 'AI credentials are coming from environment variables.',
		});
		expect(rmMock).not.toHaveBeenCalled();
	});

	it('returns a login handoff command for XHS', async () => {
		await expect(runPlatformAction('xhs', 'login')).resolves.toMatchObject({
			ok: true,
			action: 'login',
			nextCommand: 'zget xhs login',
		});
	});
});
