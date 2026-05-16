import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import RedditPublishCommand from '../../../source/commands/reddit-publish';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credStore: {
		load: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		submit: vi.fn(),
	},
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
	mocks.credStore.isAuthenticated.mockReturnValue(true);
});

describe('RedditPublishCommand', () => {
	it('submits a link post when --content is a URL', async () => {
		mocks.api.submit.mockResolvedValue({
			postId: 'p1',
			url: 'https://reddit.com/r/go/comments/p1',
		});
		const view = render(
			<RedditPublishCommand
				subreddit="go"
				text="Hello"
				content="https://example.com"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.submit).toHaveBeenCalledWith({
			subreddit: 'go',
			title: 'Hello',
			url: 'https://example.com',
			text: undefined,
		});
		expect(view.lastFrame()).toContain('"kind": "link"');
	});

	it('submits a self post when --content is plain text', async () => {
		mocks.api.submit.mockResolvedValue({postId: 'p2', url: 'u'});
		const view = render(
			<RedditPublishCommand
				subreddit="go"
				text="Hi"
				content="some text"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.submit).toHaveBeenCalledWith({
			subreddit: 'go',
			title: 'Hi',
			url: undefined,
			text: 'some text',
		});
		expect(view.lastFrame()).toContain('"kind": "self"');
	});

	it('refuses without a subreddit', async () => {
		const view = render(
			<RedditPublishCommand
				subreddit=""
				text="Hi"
				content="x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
	});

	it('refuses without --text', async () => {
		const view = render(
			<RedditPublishCommand
				subreddit="go"
				text=""
				content="x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('--text');
	});

	it('NOPERM when not authenticated', async () => {
		mocks.credStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<RedditPublishCommand
				subreddit="go"
				text="t"
				content="x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"code": 77');
	});
});
