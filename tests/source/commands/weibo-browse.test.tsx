import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import WeiboBrowseCommand from '../../../source/commands/weibo-browse';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	api: {
		getHot: vi.fn(),
		search: vi.fn(),
		getFeed: vi.fn(),
		getStatus: vi.fn(),
		getComments: vi.fn(),
		getUser: vi.fn(),
		getUserPosts: vi.fn(),
		getFavorites: vi.fn(),
		getFollowers: vi.fn(),
		getFollowing: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/weibo-auth', () => ({
	WeiboCookieStore: class {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/weibo-api', () => ({
	WeiboApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.api.getHot.mockResolvedValue([
		{
			rank: 1,
			word: 'AI',
			hot_value: 9999,
			category: 'tech',
			label: '热',
			url: 'x',
		},
	]);
	mocks.api.search.mockResolvedValue([
		{mid: 'm1', text: '搜索结果', user_screen_name: '搜索者'},
	]);
	mocks.api.getFeed.mockResolvedValue([
		{
			idstr: 's1',
			mid: 's1',
			created_at: '',
			user: {id: 1, idstr: '1', screen_name: 'FeedUser'},
			text_raw: 'feed item',
		},
	]);
	mocks.api.getStatus.mockResolvedValue({
		idstr: 's2',
		mid: 's2',
		created_at: '2026-05-01',
		user: {id: 2, idstr: '2', screen_name: 'StatusUser'},
		text_raw: 'status body',
		attitudes_count: 1,
		comments_count: 2,
		reposts_count: 3,
	});
	mocks.api.getComments.mockResolvedValue([
		{
			id: 1,
			created_at: '',
			text: 'cmt',
			text_raw: 'cmt',
			user: {id: 3, idstr: '3', screen_name: 'C'},
			like_counts: 10,
		},
	]);
	mocks.api.getUser.mockResolvedValue({
		id: 4,
		idstr: '4',
		screen_name: 'UserUser',
		description: 'desc',
		location: '北京',
		followers_count: 100,
		friends_count: 10,
		statuses_count: 200,
		verified: true,
		verified_reason: '认证',
	});
	mocks.api.getUserPosts.mockResolvedValue([
		{
			idstr: 'p1',
			mid: 'p1',
			created_at: '2026-05-01',
			user: {id: 4, idstr: '4', screen_name: 'UserUser'},
			text_raw: 'post body',
		},
	]);
	mocks.api.getFavorites.mockResolvedValue([
		{
			idstr: 'f1',
			mid: 'f1',
			created_at: '',
			user: {id: 5, idstr: '5', screen_name: 'F'},
			text_raw: 'fav body',
		},
	]);
	mocks.api.getFollowers.mockResolvedValue([
		{id: 6, idstr: '6', screen_name: 'Fan', followers_count: 1},
	]);
	mocks.api.getFollowing.mockResolvedValue([
		{id: 7, idstr: '7', screen_name: 'Idol', followers_count: 9999},
	]);
});

describe('WeiboBrowseCommand', () => {
	it('renders weibo-hot rows', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-hot"
				query=""
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('微博热搜');
		expect(frame).toContain('AI');
	});

	it('renders weibo-search rows', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-search"
				query="AI"
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('搜索者');
	});

	it('renders weibo-feed rows', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-feed"
				query=""
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('FeedUser');
	});

	it('renders weibo-read details', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-read"
				query="s2"
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('微博详情');
		expect(frame).toContain('StatusUser');
	});

	it('renders weibo-comments rows', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-comments"
				query="s2"
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('cmt');
	});

	it('renders weibo-user profile (uid input)', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-user"
				query="123"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('UserUser');
		expect(frame).toContain('北京');
	});

	it('renders weibo-user profile (screen name input)', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-user"
				query="someone"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('UserUser');
	});

	it('renders weibo-posts list', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-posts"
				query="4"
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('post body');
	});

	it('renders weibo-favorites list', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-favorites"
				query=""
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('fav body');
	});

	it('renders weibo-followers and weibo-following', async () => {
		const followers = render(
			<WeiboBrowseCommand
				browseType="weibo-followers"
				query="4"
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		expect(followers.lastFrame()).toContain('Fan');

		const following = render(
			<WeiboBrowseCommand
				browseType="weibo-following"
				query="4"
				flags={baseFlags}
				limit={5}
			/>,
		);
		await flushAsync();
		expect(following.lastFrame()).toContain('Idol');
	});

	it('emits json envelope when format=json', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-hot"
				query=""
				flags={baseFlags}
				format="json"
				limit={3}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('emits failure envelope when api throws', async () => {
		mocks.api.getHot.mockRejectedValue(new Error('boom'));
		const view = render(
			<WeiboBrowseCommand
				browseType="weibo-hot"
				query=""
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"ok": false');
		expect(frame).toContain('boom');
	});

	it('renders error display when api throws (human)', async () => {
		mocks.api.getHot.mockRejectedValue(new Error('boom2'));
		const view = render(
			<WeiboBrowseCommand browseType="weibo-hot" query="" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('boom2');
	});

	it('rejects unknown browse type', async () => {
		const view = render(
			<WeiboBrowseCommand
				browseType={'weibo-unknown' as never}
				query=""
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('Unsupported');
	});
});
