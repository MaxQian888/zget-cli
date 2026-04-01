import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import TwitterBrowseCommand from '../../../source/commands/x-browse';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credentialStore: {
		load: vi.fn(),
	},
	api: {
		searchRecent: vi.fn(),
		getUserByUsername: vi.fn(),
		resolveUserId: vi.fn(),
		getUserTimeline: vi.fn(),
		getUserFollowers: vi.fn(),
		getUserFollowing: vi.fn(),
		getMyMentions: vi.fn(),
		getMyBookmarks: vi.fn(),
		parseTweetId: vi.fn(),
		getTweetMetrics: vi.fn(),
		stripAt: vi.fn(),
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
	mocks.api.stripAt.mockImplementation((input: string) =>
		input.startsWith('@') ? input.slice(1) : input,
	);
	mocks.api.resolveUserId.mockResolvedValue('user-1');
	mocks.api.parseTweetId.mockImplementation((input: string) =>
		input.replace('url:', ''),
	);
	mocks.api.searchRecent.mockResolvedValue({
		data: [
			{
				id: 'tweet-1',
				text: 'search result tweet',
				author_id: 'user-1',
				public_metrics: {like_count: 12},
			},
		],
		includes: {users: [{id: 'user-1', username: 'openai'}]},
	});
	mocks.api.getUserByUsername.mockResolvedValue({
		data: {
			id: 'user-1',
			name: 'OpenAI',
			username: 'openai',
			description: 'AI lab',
			location: 'San Francisco',
			public_metrics: {
				tweet_count: 5,
				following_count: 6,
				followers_count: 7,
			},
		},
	});
	mocks.api.getUserTimeline.mockResolvedValue({
		data: [
			{
				id: 'tweet-2',
				text: 'timeline tweet',
				public_metrics: {like_count: 13},
			},
		],
	});
	mocks.api.getUserFollowers.mockResolvedValue({
		data: [
			{
				id: 'follower-1',
				name: 'Follower One',
				username: 'follower1',
				public_metrics: {followers_count: 10},
			},
		],
	});
	mocks.api.getUserFollowing.mockResolvedValue({
		data: [
			{
				id: 'following-1',
				name: 'Following One',
				username: 'following1',
				public_metrics: {followers_count: 11},
			},
		],
	});
	mocks.api.getMyMentions.mockResolvedValue({
		data: [{id: 'mention-1', text: 'mention tweet', author_id: 'user-2'}],
		includes: {users: [{id: 'user-2', username: 'mentioner'}]},
	});
	mocks.api.getMyBookmarks.mockResolvedValue({
		data: [{id: 'bookmark-1', text: 'bookmark tweet'}],
	});
	mocks.api.getTweetMetrics.mockResolvedValue({
		data: {
			public_metrics: {
				like_count: 1,
				retweet_count: 2,
				reply_count: 3,
				quote_count: 4,
				bookmark_count: 5,
				impression_count: 6,
			},
		},
	});
});

describe('TwitterBrowseCommand', () => {
	it('shows the loading state before X browse data resolves', async () => {
		mocks.api.searchRecent.mockImplementation(
			() =>
				new Promise<{data: unknown[]}>(() => {
					// Keep the command on its loading frame.
				}),
		);

		const view = render(
			<TwitterBrowseCommand
				browseType="x-search"
				query="openai"
				flags={baseFlags}
			/>,
		);

		expect(view.lastFrame()).toContain('正在加载...');
	});

	it.each([
		{
			name: 'x-search',
			props: {browseType: 'x-search' as const, query: 'openai'},
			expected: ['X 搜索: openai', '@openai  search result tweet  ❤️12'],
		},
		{
			name: 'x-user',
			props: {browseType: 'x-user' as const, query: '@openai'},
			expected: [
				'X 用户: @@openai',
				'OpenAI (@openai)',
				'AI lab',
				'5',
				'6',
				'7',
			],
		},
		{
			name: 'x-timeline',
			props: {browseType: 'x-timeline' as const, query: '@openai'},
			expected: ['@openai 的推文', 'timeline tweet  ❤️13'],
		},
		{
			name: 'x-followers',
			props: {browseType: 'x-followers' as const, query: '@openai'},
			expected: ['@openai 的粉丝', 'Follower One (@follower1)  粉丝: 10'],
		},
		{
			name: 'x-following',
			props: {browseType: 'x-following' as const, query: '@openai'},
			expected: ['@openai 的关注', 'Following One (@following1)  粉丝: 11'],
		},
		{
			name: 'x-mentions',
			props: {browseType: 'x-mentions' as const, query: 'ignored'},
			expected: ['我的提及', '@mentioner  mention tweet'],
		},
		{
			name: 'x-bookmarks',
			props: {browseType: 'x-bookmarks' as const, query: 'ignored'},
			expected: ['我的书签', 'bookmark tweet'],
		},
		{
			name: 'x-metrics',
			props: {browseType: 'x-metrics' as const, query: 'url:metric-1'},
			expected: ['推文指标: url:metric-1', '1', '2', '3', '4', '5', '6'],
		},
	])('renders $name in human mode', async ({props, expected}) => {
		const view = render(<TwitterBrowseCommand {...props} flags={baseFlags} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		for (const text of expected) {
			expect(frame).toContain(text);
		}
	});

	it.each([
		{
			name: 'x-search',
			props: {browseType: 'x-search' as const, query: 'openai'},
			expected: ['"text": "search result tweet"', '"username": "openai"'],
		},
		{
			name: 'x-user',
			props: {browseType: 'x-user' as const, query: '@openai'},
			expected: ['"username": "openai"', '"location": "San Francisco"'],
		},
		{
			name: 'x-timeline',
			props: {browseType: 'x-timeline' as const, query: '@openai'},
			expected: ['"text": "timeline tweet"'],
		},
		{
			name: 'x-followers',
			props: {browseType: 'x-followers' as const, query: '@openai'},
			expected: ['"username": "follower1"'],
		},
		{
			name: 'x-following',
			props: {browseType: 'x-following' as const, query: '@openai'},
			expected: ['"username": "following1"'],
		},
		{
			name: 'x-mentions',
			props: {browseType: 'x-mentions' as const, query: 'ignored'},
			expected: ['"text": "mention tweet"', '"username": "mentioner"'],
		},
		{
			name: 'x-bookmarks',
			props: {browseType: 'x-bookmarks' as const, query: 'ignored'},
			expected: ['"text": "bookmark tweet"'],
		},
		{
			name: 'x-metrics',
			props: {browseType: 'x-metrics' as const, query: 'url:metric-1'},
			expected: ['"like_count": 1', '"impression_count": 6'],
		},
	])('renders $name in json mode', async ({props, expected}) => {
		const view = render(
			<TwitterBrowseCommand {...props} flags={baseFlags} format="json" />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		for (const text of expected) {
			expect(frame).toContain(text);
		}
	});

	it('shows the empty state when X search returns no data', async () => {
		mocks.api.searchRecent.mockResolvedValue({
			data: [],
			includes: {users: []},
		});

		const view = render(
			<TwitterBrowseCommand
				browseType="x-search"
				query="nobody"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('X 搜索: nobody');
		expect(frame).toContain('无结果');
	});

	it('shows the error state when X browse data fails', async () => {
		mocks.api.searchRecent.mockRejectedValue(new Error('X 浏览失败'));

		const view = render(
			<TwitterBrowseCommand
				browseType="x-search"
				query="broken"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('X 浏览失败');
		expect(frame).toContain('X API 凭证是否正确配置');
	});

	it('formats large X metrics and hides optional location when absent', async () => {
		mocks.api.searchRecent.mockResolvedValue({
			data: [
				{
					id: 'tweet-99',
					text: 'big metric tweet',
					author_id: 'user-9',
					public_metrics: {like_count: 1500},
				},
			],
			includes: {users: [{id: 'user-9', username: 'biguser'}]},
		});
		mocks.api.getUserByUsername.mockResolvedValue({
			data: {
				id: 'user-9',
				name: 'Big User',
				username: 'biguser',
				description: 'Big account',
				public_metrics: {
					tweet_count: 2_000_000,
					following_count: 1500,
					followers_count: 3_000_000,
				},
			},
		});

		const searchView = render(
			<TwitterBrowseCommand
				browseType="x-search"
				query="big"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(searchView.lastFrame()).toContain('❤️1.5K');

		const userView = render(
			<TwitterBrowseCommand
				browseType="x-user"
				query="@biguser"
				flags={baseFlags}
			/>,
		);
		await flushAsync();

		const frame = userView.lastFrame() ?? '';
		expect(frame).toContain('2.0M');
		expect(frame).toContain('1.5K');
		expect(frame).toContain('3.0M');
		expect(frame).not.toContain('位置');
	});

	it('falls back to empty authors and empty metrics when X payloads are sparse', async () => {
		mocks.api.searchRecent.mockResolvedValue({
			data: [
				{
					id: 'tweet-sparse',
					text: 'sparse tweet',
					public_metrics: {like_count: 2_000_000},
				},
			],
		});
		mocks.api.getTweetMetrics.mockResolvedValue({data: {}});

		const searchView = render(
			<TwitterBrowseCommand
				browseType="x-search"
				query="sparse"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(searchView.lastFrame()).toContain('sparse tweet  ❤️2.0M');

		const metricsView = render(
			<TwitterBrowseCommand
				browseType="x-metrics"
				query="url:sparse"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(metricsView.lastFrame()).toContain('推文指标: url:sparse');
		expect(metricsView.lastFrame()).toContain('无结果');
	});

	it('surfaces unsupported X browse types as errors', async () => {
		const view = render(
			<TwitterBrowseCommand
				browseType={'x-unknown' as never}
				query="bad"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Unsupported X browse type');
		expect(frame).toContain('X API 凭证是否正确配置');
	});
});
