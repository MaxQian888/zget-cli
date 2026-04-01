import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import XhsBrowseCommand from '../../../source/commands/xhs-browse';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	api: {
		init: vi.fn(),
		close: vi.fn(),
		searchNotes: vi.fn(),
		getNoteWithComments: vi.fn(),
		getFeed: vi.fn(),
		getTopics: vi.fn(),
		getUserProfile: vi.fn(),
		getUserNotes: vi.fn(),
		getFollowers: vi.fn(),
		getFollowing: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/xhs-auth', () => ({
	XhsCookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/xhs-api', () => ({
	XhsApi: class MockXhsApi {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.api.init.mockResolvedValue(undefined);
	mocks.api.close.mockResolvedValue(undefined);
	mocks.api.searchNotes.mockResolvedValue([
		{
			noteId: 'note-1',
			title: '搜索笔记',
			description: '搜索描述',
			user: {nickname: '作者A'},
			likeCount: 12,
		},
	]);
	mocks.api.getNoteWithComments.mockResolvedValue({
		note: {
			noteId: 'note-2',
			title: '笔记详情',
			user: {nickname: '作者B'},
			type: 'video',
			description: '详情内容',
			imageList: [{}, {}],
			likeCount: 1,
			collectCount: 2,
			commentCount: 3,
		},
		comments: [{nickname: '评论者', content: '评论内容'}],
	});
	mocks.api.getFeed.mockResolvedValue([
		{
			noteId: 'note-3',
			title: '推荐笔记',
			description: '推荐描述',
			user: {nickname: '作者C'},
			likeCount: 13,
		},
	]);
	mocks.api.getTopics.mockResolvedValue([
		{name: 'AI', noteCount: 4, viewCount: 5},
	]);
	mocks.api.getUserProfile.mockResolvedValue({
		nickname: '用户甲',
		description: '个人简介',
		noteCount: 6,
		followerCount: 7,
		followingCount: 8,
		likeCount: 9,
		collectedCount: 10,
		ipLocation: '上海',
	});
	mocks.api.getUserNotes.mockResolvedValue([
		{
			noteId: 'note-4',
			title: '用户笔记',
			description: '用户描述',
			likeCount: 14,
		},
	]);
	mocks.api.getFollowers.mockResolvedValue([
		{nickname: '粉丝甲', followerCount: 15},
	]);
	mocks.api.getFollowing.mockResolvedValue([
		{nickname: '关注甲', followerCount: 16},
	]);
});

describe('XhsBrowseCommand', () => {
	it('shows the loading state before xhs browse data resolves', async () => {
		mocks.api.searchNotes.mockImplementation(
			() =>
				new Promise<unknown[]>(() => {
					// Keep the command on its loading frame.
				}),
		);

		const view = render(
			<XhsBrowseCommand browseType="xhs-search" query="AI" flags={baseFlags} />,
		);

		expect(view.lastFrame()).toContain('正在加载 (启动浏览器中)...');
	});

	it.each([
		{
			name: 'xhs-search',
			props: {
				browseType: 'xhs-search' as const,
				query: 'AI',
				flags: {...baseFlags, cookies: 'a1=token; web_session=session'},
			},
			expected: ['小红书搜索: AI', '搜索笔记  @作者A  ❤️12'],
			verify() {
				expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
					'a1=token; web_session=session',
				);
			},
		},
		{
			name: 'xhs-read',
			props: {
				browseType: 'xhs-read' as const,
				query: 'note-2',
				flags: baseFlags,
			},
			expected: [
				'小红书笔记: note-2',
				'笔记详情',
				'作者B',
				'视频',
				'详情内容',
				'2 张',
				'1',
				'2',
				'3',
				'热门评论',
				'评论者: 评论内容',
			],
		},
		{
			name: 'xhs-feed',
			props: {
				browseType: 'xhs-feed' as const,
				query: 'ignored',
				flags: baseFlags,
			},
			expected: ['小红书推荐', '推荐笔记  @作者C  ❤️13'],
		},
		{
			name: 'xhs-topics',
			props: {browseType: 'xhs-topics' as const, query: 'AI', flags: baseFlags},
			expected: ['小红书话题: AI', '#AI  笔记: 4  浏览: 5'],
		},
		{
			name: 'xhs-user',
			props: {
				browseType: 'xhs-user' as const,
				query: 'user-1',
				flags: baseFlags,
			},
			expected: [
				'小红书用户: user-1',
				'用户甲',
				'个人简介',
				'6',
				'7',
				'8',
				'9',
				'10',
				'上海',
			],
		},
		{
			name: 'xhs-posts',
			props: {
				browseType: 'xhs-posts' as const,
				query: 'user-1',
				flags: baseFlags,
			},
			expected: ['用户 user-1 的笔记', '用户笔记  ❤️14'],
		},
		{
			name: 'xhs-followers',
			props: {
				browseType: 'xhs-followers' as const,
				query: 'user-1',
				flags: baseFlags,
			},
			expected: ['用户 user-1 的粉丝', '粉丝甲  粉丝: 15'],
		},
		{
			name: 'xhs-following',
			props: {
				browseType: 'xhs-following' as const,
				query: 'user-1',
				flags: baseFlags,
			},
			expected: ['用户 user-1 的关注', '关注甲  粉丝: 16'],
		},
	])('renders $name in human mode', async ({props, expected, verify}) => {
		const view = render(<XhsBrowseCommand {...props} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		for (const text of expected) {
			expect(frame).toContain(text);
		}

		verify?.();
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it.each([
		{
			name: 'xhs-search',
			props: {browseType: 'xhs-search' as const, query: 'AI'},
			expected: ['"noteId": "note-1"', '"nickname": "作者A"'],
		},
		{
			name: 'xhs-read',
			props: {browseType: 'xhs-read' as const, query: 'note-2'},
			expected: ['"title": "笔记详情"', '"nickname": "评论者"'],
		},
		{
			name: 'xhs-feed',
			props: {browseType: 'xhs-feed' as const, query: 'ignored'},
			expected: ['"title": "推荐笔记"'],
		},
		{
			name: 'xhs-topics',
			props: {browseType: 'xhs-topics' as const, query: 'AI'},
			expected: ['"name": "AI"', '"viewCount": 5'],
		},
		{
			name: 'xhs-user',
			props: {browseType: 'xhs-user' as const, query: 'user-1'},
			expected: ['"nickname": "用户甲"', '"ipLocation": "上海"'],
		},
		{
			name: 'xhs-posts',
			props: {browseType: 'xhs-posts' as const, query: 'user-1'},
			expected: ['"title": "用户笔记"'],
		},
		{
			name: 'xhs-followers',
			props: {browseType: 'xhs-followers' as const, query: 'user-1'},
			expected: ['"nickname": "粉丝甲"'],
		},
		{
			name: 'xhs-following',
			props: {browseType: 'xhs-following' as const, query: 'user-1'},
			expected: ['"nickname": "关注甲"'],
		},
	])('renders $name in json mode', async ({props, expected}) => {
		const view = render(
			<XhsBrowseCommand {...props} flags={baseFlags} format="json" />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		for (const text of expected) {
			expect(frame).toContain(text);
		}

		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('shows the empty state when xhs search returns no data', async () => {
		mocks.api.searchNotes.mockResolvedValue([]);

		const view = render(
			<XhsBrowseCommand
				browseType="xhs-search"
				query="empty"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('小红书搜索: empty');
		expect(frame).toContain('无结果');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('shows the error state when xhs browse data fails', async () => {
		mocks.api.searchNotes.mockRejectedValue(new Error('小红书浏览失败'));

		const view = render(
			<XhsBrowseCommand
				browseType="xhs-search"
				query="broken"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('小红书浏览失败');
		expect(frame).toContain('运行 "zget xhs login" 登录后重试');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('formats large xhs counters and omits optional profile details when absent', async () => {
		mocks.api.getTopics.mockResolvedValue([
			{name: '大话题', noteCount: 12_000, viewCount: 100_000_000},
		]);
		mocks.api.getUserProfile.mockResolvedValue({
			nickname: '无地区用户',
			description: '简介',
			noteCount: 12_000,
			followerCount: 100_000_000,
			followingCount: 2,
			likeCount: 3,
			collectedCount: 4,
		});

		const topicsView = render(
			<XhsBrowseCommand
				browseType="xhs-topics"
				query="big"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(topicsView.lastFrame()).toContain('1.2万');
		expect(topicsView.lastFrame()).toContain('1.0亿');

		const userView = render(
			<XhsBrowseCommand
				browseType="xhs-user"
				query="big-user"
				flags={baseFlags}
			/>,
		);
		await flushAsync();

		const frame = userView.lastFrame() ?? '';
		expect(frame).toContain('1.2万');
		expect(frame).toContain('1.0亿');
		expect(frame).not.toContain('IP属地');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('renders note detail without comments when the thread is empty', async () => {
		mocks.api.getNoteWithComments.mockResolvedValue({
			note: {
				noteId: 'note-empty',
				title: '图文笔记',
				user: {nickname: '作者C'},
				type: 'normal',
				description: '没有评论',
				imageList: [{}],
				likeCount: 1,
				collectCount: 2,
				commentCount: 0,
			},
			comments: [],
		});

		const view = render(
			<XhsBrowseCommand
				browseType="xhs-read"
				query="note-empty"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('图文');
		expect(frame).not.toContain('热门评论');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('falls back to descriptions when xhs titles are missing', async () => {
		mocks.api.searchNotes.mockResolvedValue([
			{
				noteId: 'note-desc',
				description: '只有描述的搜索结果',
				user: {nickname: '作者描述'},
				likeCount: 1,
			},
		]);
		mocks.api.getUserNotes.mockResolvedValue([
			{
				noteId: 'note-post-desc',
				description: '只有描述的用户笔记',
				likeCount: 2,
			},
		]);

		const searchView = render(
			<XhsBrowseCommand
				browseType="xhs-search"
				query="fallback"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(searchView.lastFrame()).toContain('只有描述的搜索结果  @作者描述');

		const postsView = render(
			<XhsBrowseCommand
				browseType="xhs-posts"
				query="fallback-user"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(postsView.lastFrame()).toContain('只有描述的用户笔记  ❤️2');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('surfaces unsupported xhs browse types as errors', async () => {
		const view = render(
			<XhsBrowseCommand
				browseType={'xhs-unknown' as never}
				query="bad"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Unsupported Xiaohongshu browse type');
		expect(frame).toContain('运行 "zget xhs login" 登录后重试');
		expect(mocks.api.close).toHaveBeenCalled();
	});
});
