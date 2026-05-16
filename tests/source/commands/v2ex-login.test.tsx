import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import V2exLoginCommand from '../../../source/commands/v2ex-login';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	tokenStore: {
		load: vi.fn(),
		save: vi.fn(),
		clear: vi.fn(),
		setToken: vi.fn(),
		isAuthenticated: vi.fn(),
		getToken: vi.fn(),
	},
	api: {
		getMyMember: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/v2ex-auth', () => ({
	V2exTokenStore: class {
		constructor() {
			return mocks.tokenStore;
		}
	},
}));

vi.mock('../../../source/core/api/v2ex-api', () => ({
	V2exApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.tokenStore.load.mockResolvedValue(undefined);
	mocks.tokenStore.save.mockResolvedValue(undefined);
	mocks.tokenStore.isAuthenticated.mockReturnValue(true);
});

describe('V2exLoginCommand', () => {
	it('saves a token passed via --cookie and emits JSON envelope', async () => {
		const view = render(
			<V2exLoginCommand
				mode="v2ex-login"
				flags={baseFlags}
				cookie="pat-abc"
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.tokenStore.setToken).toHaveBeenCalledWith('pat-abc');
		expect(mocks.tokenStore.save).toHaveBeenCalled();
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('also accepts --cookies as the token', async () => {
		const view = render(
			<V2exLoginCommand
				mode="v2ex-login"
				flags={{...baseFlags, cookies: 'pat-xyz'}}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.tokenStore.setToken).toHaveBeenCalledWith('pat-xyz');
		expect(view.lastFrame()).toContain('"source": "token-flag"');
	});

	it('refuses login without a token argument', async () => {
		const view = render(
			<V2exLoginCommand mode="v2ex-login" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('PAT');
	});

	it('whoami fetches the member profile', async () => {
		mocks.api.getMyMember.mockResolvedValue({
			id: 1,
			username: 'alice',
			tagline: 't',
		});
		const view = render(
			<V2exLoginCommand mode="v2ex-whoami" flags={baseFlags} format="human" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('alice');
	});

	it('whoami without auth surfaces the login hint', async () => {
		mocks.tokenStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<V2exLoginCommand mode="v2ex-whoami" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"code": 77');
	});

	it('logout clears the store', async () => {
		const view = render(
			<V2exLoginCommand mode="v2ex-logout" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(mocks.tokenStore.clear).toHaveBeenCalled();
		expect(view.lastFrame()).toContain('"cleared": true');
	});
});
