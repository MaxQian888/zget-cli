import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import RedditLoginCommand from '../../../source/commands/reddit-login';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credStore: {
		load: vi.fn(),
		save: vi.fn(),
		clear: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		getMyProfile: vi.fn(),
	},
	performRedditPasswordLogin: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/reddit-auth', () => ({
	RedditCredentialStore: class {
		constructor() {
			return mocks.credStore;
		}
	},
	performRedditPasswordLogin: mocks.performRedditPasswordLogin,
}));

vi.mock('../../../source/core/api/reddit-api', () => ({
	RedditApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.credStore.load.mockResolvedValue(undefined);
	mocks.credStore.save.mockResolvedValue(undefined);
	mocks.credStore.isAuthenticated.mockReturnValue(true);
	mocks.performRedditPasswordLogin.mockResolvedValue(mocks.credStore);
});

describe('RedditLoginCommand', () => {
	it('accepts a JSON --cookie blob and runs the password login flow', async () => {
		const view = render(
			<RedditLoginCommand
				mode="reddit-login"
				flags={baseFlags}
				cookie='{"clientId":"c","clientSecret":"s","username":"u","password":"p"}'
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.performRedditPasswordLogin).toHaveBeenCalledWith({
			clientId: 'c',
			clientSecret: 's',
			username: 'u',
			password: 'p',
		});
		expect(view.lastFrame()).toContain('"ok": true');
		expect(view.lastFrame()).toContain('"username": "u"');
	});

	it('refuses login when no credentials are supplied', async () => {
		const view = render(
			<RedditLoginCommand
				mode="reddit-login"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('REDDIT_CLIENT_ID');
	});

	it('whoami fetches profile and renders details', async () => {
		mocks.api.getMyProfile.mockResolvedValue({
			id: 'u1',
			name: 'alice',
			created_utc: 0,
			total_karma: 99,
			link_karma: 10,
			comment_karma: 89,
		});
		const view = render(
			<RedditLoginCommand
				mode="reddit-whoami"
				flags={baseFlags}
				format="human"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('u/alice');
		expect(view.lastFrame()).toContain('99');
	});

	it('whoami without auth surfaces NOPERM', async () => {
		mocks.credStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<RedditLoginCommand
				mode="reddit-whoami"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"code": 77');
	});

	it('logout clears the store', async () => {
		const view = render(
			<RedditLoginCommand
				mode="reddit-logout"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.credStore.clear).toHaveBeenCalled();
		expect(view.lastFrame()).toContain('"cleared": true');
	});

	it('login surfaces an error when the password grant rejects', async () => {
		mocks.performRedditPasswordLogin.mockRejectedValueOnce(
			new Error('Reddit token exchange failed: 401'),
		);
		const view = render(
			<RedditLoginCommand
				mode="reddit-login"
				flags={baseFlags}
				cookie='{"clientId":"c","clientSecret":"s","username":"u","password":"bad"}'
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
	});
});
