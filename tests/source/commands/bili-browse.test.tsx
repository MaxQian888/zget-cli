import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import BiliBrowseCommand from '../../../source/commands/bili-browse';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	api: {
		search: vi.fn(),
		getVideoInfo: vi.fn(),
		getSubtitles: vi.fn(),
		getUserInfo: vi.fn(),
		getUserVideos: vi.fn(),
		getHotVideos: vi.fn(),
		getRanking: vi.fn(),
		getRelatedVideos: vi.fn(),
		getComments: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/bili-auth', () => ({
	BiliCookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/bili-api', () => ({
	BiliApi: class MockBiliApi {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.api.search.mockResolvedValue([
		{
			bvid: 'BV1search',
			title: '搜索视频',
			author: 'UP主A',
			play: 11,
			duration: '01:20',
		},
	]);
	mocks.api.getVideoInfo.mockResolvedValue({
		bvid: 'BV1detail',
		aid: 1,
		cid: 2,
		title: '视频详情',
		desc: '简介内容',
		pic: '',
		owner: {name: 'UP主B', mid: 123, face: ''},
		stat: {
			view: 1,
			danmaku: 5,
			reply: 6,
			favorite: 4,
			coin: 3,
			share: 7,
			like: 2,
		},
		pages: [],
		pubdate: 0,
		duration: 80,
		tname: '科技',
	});
	mocks.api.getSubtitles.mockResolvedValue({
		body: [{from: 0, to: 1, content: '字幕'}],
	});
	mocks.api.getUserInfo.mockResolvedValue({
		name: '用户甲',
		mid: 111,
		face: '',
		sign: '个性签名',
		follower: 12,
		following: 13,
		archive_count: 14,
	});
	mocks.api.getUserVideos.mockResolvedValue({
		list: {
			vlist: [
				{
					bvid: 'BV1user',
					title: '用户视频',
					play: 15,
					created: 0,
					description: '',
					pic: '',
					length: '02:00',
				},
			],
		},
		page: {count: 1},
	});
	mocks.api.getHotVideos.mockResolvedValue([
		{
			bvid: 'BV1hot',
			title: '热门视频',
			owner: {name: 'UP主热', mid: 1, face: ''},
			stat: {
				view: 16,
				danmaku: 0,
				reply: 0,
				favorite: 0,
				coin: 0,
				share: 0,
				like: 0,
			},
			pic: '',
			duration: 60,
			score: 0,
		},
	]);
	mocks.api.getRanking.mockResolvedValue([
		{
			bvid: 'BV1rank',
			title: '排行榜视频',
			owner: {name: 'UP主榜', mid: 2, face: ''},
			stat: {
				view: 17,
				danmaku: 0,
				reply: 0,
				favorite: 0,
				coin: 0,
				share: 0,
				like: 0,
			},
			pic: '',
			duration: 70,
			score: 99,
		},
	]);
	mocks.api.getRelatedVideos.mockResolvedValue([
		{
			bvid: 'BV1related',
			title: '相关视频',
			owner: {name: 'UP主关', mid: 3, face: ''},
			stat: {
				view: 18,
				danmaku: 0,
				reply: 0,
				favorite: 0,
				coin: 0,
				share: 0,
				like: 0,
			},
			pic: '',
			duration: 80,
		},
	]);
	mocks.api.getComments.mockResolvedValue([
		{
			rpid: 1,
			content: {message: '评论内容'},
			member: {uname: '评论者', avatar: ''},
			ctime: 0,
			like: 19,
			rcount: 0,
		},
	]);
});

describe('BiliBrowseCommand', () => {
	it('shows the loading state before bili browse data resolves', async () => {
		mocks.api.search.mockImplementation(() => new Promise<unknown[]>(() => {}));

		const view = render(
			<BiliBrowseCommand
				browseType="bili-search"
				query="AI"
				flags={baseFlags}
			/>,
		);

		expect(view.lastFrame()).toContain('正在加载...');
	});

	it.each([
		{
			name: 'bili-search',
			props: {
				browseType: 'bili-search' as const,
				query: 'AI',
				flags: {...baseFlags, cookies: 'SESSDATA=value'},
			},
			expected: ['Bilibili 搜索: AI', '搜索视频  @UP主A  ▶️11  01:20'],
			verify() {
				expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
					'SESSDATA=value',
				);
			},
		},
		{
			name: 'bili-video',
			props: {
				browseType: 'bili-video' as const,
				query: 'BV1detail',
				flags: baseFlags,
			},
			expected: [
				'Bilibili 视频: BV1detail',
				'视频详情',
				'UP主B (UID: 123)',
				'科技',
				'1:20',
				'简介内容',
				'字幕',
				'有',
			],
		},
		{
			name: 'bili-user',
			props: {browseType: 'bili-user' as const, query: '111', flags: baseFlags},
			expected: [
				'Bilibili 用户: 111',
				'用户甲',
				'111',
				'个性签名',
				'12',
				'13',
				'14',
			],
		},
		{
			name: 'bili-videos',
			props: {
				browseType: 'bili-videos' as const,
				query: '111',
				flags: baseFlags,
			},
			expected: [
				'用户 111 的视频',
				'用户视频  ▶️15  02:00',
				'总计',
				'1 个视频',
			],
		},
		{
			name: 'bili-hot',
			props: {
				browseType: 'bili-hot' as const,
				query: 'ignored',
				flags: baseFlags,
			},
			expected: ['Bilibili 热门视频', '热门视频  @UP主热  ▶️16'],
		},
		{
			name: 'bili-ranking',
			props: {
				browseType: 'bili-ranking' as const,
				query: 'ignored',
				flags: baseFlags,
			},
			expected: ['Bilibili 排行榜', '排行榜视频  @UP主榜  ▶️17  分99'],
		},
		{
			name: 'bili-related',
			props: {
				browseType: 'bili-related' as const,
				query: 'BV1detail',
				flags: baseFlags,
			},
			expected: ['相关视频: BV1detail', '相关视频  @UP主关  ▶️18'],
		},
		{
			name: 'bili-comments',
			props: {
				browseType: 'bili-comments' as const,
				query: 'BV1detail',
				flags: baseFlags,
			},
			expected: ['视频评论: BV1detail', '评论者: 评论内容  👍19'],
		},
	])('renders $name in human mode', async ({props, expected, verify}) => {
		const view = render(<BiliBrowseCommand {...props} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		for (const text of expected) {
			expect(frame).toContain(text);
		}

		verify?.();
	});

	it.each([
		{
			name: 'bili-search',
			props: {browseType: 'bili-search' as const, query: 'AI'},
			expected: ['"title": "搜索视频"', '"author": "UP主A"'],
		},
		{
			name: 'bili-video',
			props: {browseType: 'bili-video' as const, query: 'BV1detail'},
			expected: ['"title": "视频详情"', '"tname": "科技"'],
		},
		{
			name: 'bili-user',
			props: {browseType: 'bili-user' as const, query: '111'},
			expected: ['"name": "用户甲"', '"mid": 111'],
		},
		{
			name: 'bili-videos',
			props: {browseType: 'bili-videos' as const, query: '111'},
			expected: ['"title": "用户视频"', '"count": 1'],
		},
		{
			name: 'bili-hot',
			props: {browseType: 'bili-hot' as const, query: 'ignored'},
			expected: ['"title": "热门视频"'],
		},
		{
			name: 'bili-ranking',
			props: {browseType: 'bili-ranking' as const, query: 'ignored'},
			expected: ['"title": "排行榜视频"', '"score": 99'],
		},
		{
			name: 'bili-related',
			props: {browseType: 'bili-related' as const, query: 'BV1detail'},
			expected: ['"title": "相关视频"'],
		},
		{
			name: 'bili-comments',
			props: {browseType: 'bili-comments' as const, query: 'BV1detail'},
			expected: ['"message": "评论内容"', '"uname": "评论者"'],
		},
	])('renders $name in json mode', async ({props, expected}) => {
		const view = render(
			<BiliBrowseCommand {...props} flags={baseFlags} format="json" />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		for (const text of expected) {
			expect(frame).toContain(text);
		}
	});

	it('falls back to unknown subtitle status when subtitle lookup fails', async () => {
		mocks.api.getSubtitles.mockRejectedValue(new Error('subtitle failed'));

		const view = render(
			<BiliBrowseCommand
				browseType="bili-video"
				query="BV1detail"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('字幕');
		expect(frame).toContain('未知');
	});

	it('shows the empty state when bili search returns no data', async () => {
		mocks.api.search.mockResolvedValue([]);

		const view = render(
			<BiliBrowseCommand
				browseType="bili-search"
				query="empty"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Bilibili 搜索: empty');
		expect(frame).toContain('无结果');
	});

	it('shows the error state when bili browse data fails', async () => {
		mocks.api.search.mockRejectedValue(new Error('Bilibili 浏览失败'));

		const view = render(
			<BiliBrowseCommand
				browseType="bili-search"
				query="broken"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Bilibili 浏览失败');
		expect(frame).toContain('运行 "zget bili login" 登录后重试');
	});
});
