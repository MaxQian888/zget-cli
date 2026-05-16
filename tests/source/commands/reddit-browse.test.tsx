import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import RedditBrowseCommand from '../../../source/commands/reddit-browse';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credStore: {
		load: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		getHot: vi.fn(),
		getTop: vi.fn(),
		getNew: vi.fn(),
		search: vi.fn(),
		getSubreddit: vi.fn(),
		getPost: vi.fn(),
		getComments: vi.fn(),
		getUser: vi.fn(),
		getUserPosts: vi.fn(),
		getUserComments: vi.fn(),
		getSaved: vi.fn(),
		getSubscribed: vi.fn(),
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
});

describe('RedditBrowseCommand', () => {
	it.each([
		['reddit-hot' as const, 'getHot'],
		['reddit-top' as const, 'getTop'],
		['reddit-new' as const, 'getNew'],
	])('%s routes to api.%s', async (browseType, method) => {
		(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[
			method
		].mockResolvedValue([]);
		render(
			<RedditBrowseCommand
				browseType={browseType}
				query=""
				flags={baseFlags}
				limit={5}
				format="json"
			/>,
		);
		await flushAsync();
		expect(
			(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[method],
		).toHaveBeenCalled();
	});

	it('search forwards the query', async () => {
		mocks.api.search.mockResolvedValue([]);
		render(
			<RedditBrowseCommand
				browseType="reddit-search"
				query="rust"
				flags={baseFlags}
				limit={5}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.search).toHaveBeenCalledWith('rust', {limit: 5});
	});

	it('search without query surfaces an error', async () => {
		const view = render(
			<RedditBrowseCommand
				browseType="reddit-search"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
	});

	it('subreddit fetches metadata', async () => {
		mocks.api.getSubreddit.mockResolvedValue({
			display_name: 'programming',
			title: 'Programming',
			subscribers: 1,
			public_description: 'pd',
		});
		const view = render(
			<RedditBrowseCommand
				browseType="reddit-subreddit"
				query="programming"
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getSubreddit).toHaveBeenCalledWith('programming');
		expect(view.lastFrame()).toContain('"display_name": "programming"');
	});

	it('read fetches a post', async () => {
		mocks.api.getPost.mockResolvedValue({
			id: 'abc',
			title: 'T',
			author: 'a',
			subreddit: 's',
			permalink: '/p',
			score: 1,
			num_comments: 0,
			created_utc: 0,
		});
		render(
			<RedditBrowseCommand
				browseType="reddit-read"
				query="abc"
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getPost).toHaveBeenCalledWith('abc');
	});

	it('comments fetches the comment tree', async () => {
		mocks.api.getComments.mockResolvedValue([]);
		render(
			<RedditBrowseCommand
				browseType="reddit-comments"
				query="abc"
				flags={baseFlags}
				limit={5}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getComments).toHaveBeenCalledWith('abc', {limit: 5});
	});

	it.each([
		['reddit-user' as const, 'getUser'],
		['reddit-user-posts' as const, 'getUserPosts'],
		['reddit-user-comments' as const, 'getUserComments'],
	])('%s routes to api.%s', async (browseType, method) => {
		(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[
			method
		].mockResolvedValue([]);
		render(
			<RedditBrowseCommand
				browseType={browseType}
				query="pg"
				flags={baseFlags}
				limit={5}
				format="json"
			/>,
		);
		await flushAsync();
		expect(
			(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[method],
		).toHaveBeenCalled();
	});

	it('saved + subscribed call their respective endpoints', async () => {
		mocks.api.getSaved.mockResolvedValue([]);
		mocks.api.getSubscribed.mockResolvedValue([]);
		render(
			<RedditBrowseCommand
				browseType="reddit-saved"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getSaved).toHaveBeenCalled();
		render(
			<RedditBrowseCommand
				browseType="reddit-subscribed"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getSubscribed).toHaveBeenCalled();
	});

	it('surfaces a human-readable error when the API throws', async () => {
		mocks.api.getHot.mockRejectedValue(new Error('boom'));
		const view = render(
			<RedditBrowseCommand
				browseType="reddit-hot"
				query=""
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('boom');
	});

	it.each([
		['reddit-subreddit' as const, 'subreddit'],
		['reddit-read' as const, 'post ID'],
		['reddit-comments' as const, 'post ID'],
		['reddit-user' as const, '用户名'],
		['reddit-user-posts' as const, '用户名'],
		['reddit-user-comments' as const, '用户名'],
	])('%s without a query surfaces a usage error', async browseType => {
		const view = render(
			<RedditBrowseCommand
				browseType={browseType}
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
	});

	it('subreddit fills fallbacks when fields are missing (human mode)', async () => {
		mocks.api.getSubreddit.mockResolvedValue({
			display_name: 'tiny',
			title: undefined,
			subscribers: undefined,
			public_description: undefined,
		});
		const view = render(
			<RedditBrowseCommand
				browseType="reddit-subreddit"
				query="tiny"
				flags={baseFlags}
				limit={1}
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('tiny');
	});

	it('read includes the url row only when post.url is set', async () => {
		mocks.api.getPost.mockResolvedValue({
			id: 'abc',
			title: 'T',
			author: 'a',
			subreddit: 's',
			permalink: '/p',
			score: 1,
			num_comments: 0,
			created_utc: 0,
			selftext: undefined,
			url: 'https://example.com',
		});
		const view = render(
			<RedditBrowseCommand
				browseType="reddit-read"
				query="abc"
				flags={baseFlags}
				limit={1}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame() ?? '').toContain('example.com');
	});

	it('user fills karma fallbacks when totals are missing', async () => {
		mocks.api.getUser.mockResolvedValue({
			id: 'u',
			name: 'pg',
			created_utc: 0,
		});
		const view = render(
			<RedditBrowseCommand
				browseType="reddit-user"
				query="pg"
				flags={baseFlags}
				limit={1}
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('pg');
		expect(frame).toContain('0');
	});

	it('comments and user-comments handle missing body text', async () => {
		mocks.api.getComments.mockResolvedValue([
			{id: 'c1', author: 'a', body: undefined, score: 0, created_utc: 0},
		]);
		mocks.api.getUserComments.mockResolvedValue([
			{id: 'cu1', author: 'a', body: undefined, score: 0, created_utc: 0},
		]);
		const v1 = render(
			<RedditBrowseCommand
				browseType="reddit-comments"
				query="p1"
				flags={baseFlags}
				limit={1}
			/>,
		);
		await flushAsync();
		expect(v1.lastFrame() ?? '').toContain('u/a');

		const v2 = render(
			<RedditBrowseCommand
				browseType="reddit-user-comments"
				query="a"
				flags={baseFlags}
				limit={1}
			/>,
		);
		await flushAsync();
		expect(v2.lastFrame() ?? '').toContain('#cu1');
	});

	it('saved branches on whether each item is a post (has title) or a comment', async () => {
		mocks.api.getSaved.mockResolvedValue([
			{id: 's1', title: 'a post', author: 'me', subreddit: 'r', score: 0},
			{id: 's2', body: 'a comment', author: 'me', score: 0},
		]);
		const view = render(
			<RedditBrowseCommand
				browseType="reddit-saved"
				query=""
				flags={baseFlags}
				limit={2}
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('a post');
		expect(frame).toContain('a comment');
	});

	it('subscribed renders display_name and falls back when subscribers missing', async () => {
		mocks.api.getSubscribed.mockResolvedValue([
			{display_name: 's', subscribers: undefined},
		]);
		const view = render(
			<RedditBrowseCommand
				browseType="reddit-subscribed"
				query=""
				flags={baseFlags}
				limit={1}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame() ?? '').toContain('r/s');
	});

	it('rejects an unknown browse type', async () => {
		const view = render(
			<RedditBrowseCommand
				browseType={'reddit-unknown' as never}
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('Unsupported');
	});
});
