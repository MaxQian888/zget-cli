import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import TwitterLoginCommand from '../../../source/commands/x-login';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credentialStore: {
		load: vi.fn(),
		isConfigured: vi.fn(),
	},
	api: {
		getMyUser: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/x-auth', () => ({
	XCredentialStore: class MockCredentialStore {
		constructor() {
			return mocks.credentialStore;
		}
	},
}));

vi.mock('../../../source/core/api/x-api', () => ({
	XApi: class MockXApi {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.credentialStore.load.mockResolvedValue(undefined);
	mocks.credentialStore.isConfigured.mockReturnValue(true);
	mocks.api.getMyUser.mockResolvedValue({
		data: {name: 'OpenAI', username: 'openai'},
	});
});

describe('TwitterLoginCommand', () => {
	it('shows the configured account when credentials are valid', async () => {
		const view = render(<TwitterLoginCommand flags={baseFlags} />);

		expect(view.lastFrame()).toContain('正在检查 X API 配置...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ X API 已配置');
		expect(frame).toContain('OpenAI (@openai)');
	});

	it('shows the environment variable instructions when credentials are missing', async () => {
		mocks.credentialStore.isConfigured.mockReturnValue(false);

		const view = render(<TwitterLoginCommand flags={baseFlags} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('X API 配置');
		expect(frame).toContain('X_API_KEY=<your_api_key>');
		expect(frame).toContain('developer.x.com/en/portal/dashboard');
	});

	it('renders an error surface when validation fails', async () => {
		mocks.api.getMyUser.mockRejectedValue(new Error('凭证无效'));

		const view = render(<TwitterLoginCommand flags={baseFlags} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('凭证无效');
		expect(frame).toContain('请检查 X API 凭证是否正确');
	});
});
