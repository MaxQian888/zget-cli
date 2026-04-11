import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
	probeZhihuLocalStateMock,
	probeTwitterLocalStateMock,
	probeXhsLocalStateMock,
	probeBiliLocalStateMock,
	probeAiLocalStateMock,
	xCredentialStoreLoadMock,
	xApiGetMyUserMock,
} = vi.hoisted(() => ({
	probeZhihuLocalStateMock: vi.fn(),
	probeTwitterLocalStateMock: vi.fn(),
	probeXhsLocalStateMock: vi.fn(),
	probeBiliLocalStateMock: vi.fn(),
	probeAiLocalStateMock: vi.fn(),
	xCredentialStoreLoadMock: vi.fn(),
	xApiGetMyUserMock: vi.fn(),
}));

vi.mock('../../../source/core/account/platform-probes', () => ({
	probeZhihuLocalState: probeZhihuLocalStateMock,
	probeTwitterLocalState: probeTwitterLocalStateMock,
	probeXhsLocalState: probeXhsLocalStateMock,
	probeBiliLocalState: probeBiliLocalStateMock,
	probeAiLocalState: probeAiLocalStateMock,
}));

vi.mock('../../../source/core/auth/x-auth', () => ({
	XCredentialStore: class {
		load = xCredentialStoreLoadMock;
	},
}));

vi.mock('../../../source/core/api/x-api', () => ({
	XApi: class {
		getMyUser = xApiGetMyUserMock;
	},
}));

import {
	getAccountOverview,
	getPlatformAccountState,
} from '../../../source/core/account/account-status';

describe('account status snapshots', () => {
	beforeEach(() => {
		probeZhihuLocalStateMock.mockReset().mockResolvedValue({
			platform: 'zhihu',
			status: 'missing',
			credentialSource: 'none',
		});
		probeTwitterLocalStateMock.mockReset().mockResolvedValue({
			platform: 'x',
			status: 'missing',
			credentialSource: 'none',
		});
		probeXhsLocalStateMock.mockReset().mockResolvedValue({
			platform: 'xhs',
			status: 'missing',
			credentialSource: 'none',
		});
		probeBiliLocalStateMock.mockReset().mockResolvedValue({
			platform: 'bili',
			status: 'missing',
			credentialSource: 'none',
		});
		probeAiLocalStateMock.mockReset().mockResolvedValue({
			platform: 'ai',
			status: 'missing',
			credentialSource: 'none',
		});
		xCredentialStoreLoadMock.mockReset().mockResolvedValue(undefined);
		xApiGetMyUserMock.mockReset();
	});

	it('returns missing unchanged when Zhihu has no local auth state', async () => {
		await expect(getPlatformAccountState('zhihu')).resolves.toMatchObject({
			platform: 'zhihu',
			status: 'missing',
			credentialSource: 'none',
		});
	});

	it('returns ready for X in the overview when getMyUser succeeds', async () => {
		probeTwitterLocalStateMock.mockResolvedValue({
			platform: 'x',
			status: 'detected',
			credentialSource: 'env',
		});
		xApiGetMyUserMock.mockResolvedValue({
			data: {
				id: '42',
				name: 'OpenAI',
				username: 'tester',
			},
		});

		const overview = await getAccountOverview();
		const state = overview.find(item => item.platform === 'x');

		expect(state).toMatchObject({
			platform: 'x',
			status: 'ready',
			credentialSource: 'env',
			identity: {
				id: '42',
				displayName: 'OpenAI',
				handle: '@tester',
			},
		});
		expect(state?.lastValidatedAt).toEqual(expect.any(String));
	});

	it('returns error for X when getMyUser rejects', async () => {
		probeTwitterLocalStateMock.mockResolvedValue({
			platform: 'x',
			status: 'detected',
			credentialSource: 'file',
		});
		xApiGetMyUserMock.mockRejectedValue(new Error('bad credentials'));

		await expect(getPlatformAccountState('x')).resolves.toMatchObject({
			platform: 'x',
			status: 'error',
			credentialSource: 'file',
			latestError: 'bad credentials',
		});
	});

	it('keeps AI as detected when local config exists but no remote validation is required', async () => {
		probeAiLocalStateMock.mockResolvedValue({
			platform: 'ai',
			status: 'detected',
			credentialSource: 'env',
		});

		await expect(getPlatformAccountState('ai')).resolves.toMatchObject({
			platform: 'ai',
			status: 'detected',
			credentialSource: 'env',
		});
	});
});
