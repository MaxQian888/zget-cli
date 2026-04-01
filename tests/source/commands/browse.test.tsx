import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import BrowseCommand from '../../../source/commands/browse';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	api: {
		search: vi.fn(),
		getHotList: vi.fn(),
		getQuestion: vi.fn(),
		getQuestionAnswers: vi.fn(),
		getAnswer: vi.fn(),
		getFeed: vi.fn(),
		getTopic: vi.fn(),
		getUserProfile: vi.fn(),
		getUserAnswers: vi.fn(),
		getUserArticles: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/cookie-store', () => ({
	CookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/client', () => ({
	ApiClient: class MockApiClient {
		constructor() {
			return {kind: 'client'};
		}
	},
}));

vi.mock('../../../source/core/api/zhihu-api', () => ({
	ZhihuApi: class MockZhihuApi {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.api.search.mockResolvedValue({
		items: [
			{
				highlight: {
					title: '<em>标题</em>',
					description: '<p>摘要</p>',
				},
			},
		],
	});
	mocks.api.getHotList.mockResolvedValue([
		{
			target: {title: '热门话题', excerpt: '热度描述'},
		},
	]);
	mocks.api.getQuestion.mockResolvedValue({
		title: '问题标题',
		detail: '<p>问题详情</p>',
		answer_count: 3,
		follower_count: 4,
		visit_count: 5,
	});
	mocks.api.getQuestionAnswers.mockResolvedValue({
		items: [
			{
				author: {name: '作者甲'},
				content: '<p>回答内容</p>',
				voteup_count: 6,
			},
		],
	});
	mocks.api.getAnswer.mockResolvedValue({
		question: {title: '关联问题'},
		author: {name: '作者乙'},
		content: '<p>详细回答</p>',
		voteup_count: 7,
		comment_count: 8,
	});
	mocks.api.getFeed.mockResolvedValue([
		{
			type: 'answer',
			target: {title: '推荐内容'},
		},
	]);
	mocks.api.getTopic.mockResolvedValue({
		name: 'AI 话题',
		introduction: '<p>话题介绍</p>',
		followers_count: 9,
	});
	mocks.api.getUserProfile.mockResolvedValue({
		name: 'OpenAI',
		headline: '研究组织',
		answerCount: 1,
		articlesCount: 2,
		followerCount: 3,
	});
	mocks.api.getUserAnswers.mockResolvedValue({
		items: [{question: {title: '回答问题'}}],
	});
	mocks.api.getUserArticles.mockResolvedValue({
		items: [{title: '文章标题'}],
	});
});

describe('BrowseCommand', () => {
	it('shows the loading state before browse results resolve', async () => {
		mocks.api.search.mockImplementation(
			() =>
				new Promise<{items: unknown[]}>(() => {
					// Keep the command on its loading frame.
				}),
		);

		const view = render(
			<BrowseCommand browseType="search" query="AI" flags={baseFlags} />,
		);

		expect(view.lastFrame()).toContain('正在加载...');
	});

	it.each([
		{
			name: 'search results',
			props: {
				browseType: 'search' as const,
				query: 'AI',
				flags: {...baseFlags, cookies: 'z_c0=token'},
			},
			expected: ['搜索: AI', '标题  摘要'],
			verify() {
				expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
					'z_c0=token',
				);
			},
		},
		{
			name: 'hot list',
			props: {browseType: 'hot' as const, query: 'ignored', flags: baseFlags},
			expected: ['知乎热榜', '热门话题  热度描述'],
		},
		{
			name: 'question details',
			props: {
				browseType: 'question' as const,
				query: 'question-1',
				flags: baseFlags,
			},
			expected: ['问题详情', '问题标题', '问题详情', '3', '4', '5'],
		},
		{
			name: 'question answers',
			props: {
				browseType: 'answers' as const,
				query: 'question-1',
				flags: baseFlags,
			},
			expected: ['问题 question-1 的回答', '作者甲  回答内容  ▲6'],
		},
		{
			name: 'single answer',
			props: {
				browseType: 'answer' as const,
				query: 'answer-1',
				flags: baseFlags,
			},
			expected: ['回答详情', '关联问题', '作者乙', '详细回答', '7', '8'],
		},
		{
			name: 'feed items',
			props: {browseType: 'feed' as const, query: 'ignored', flags: baseFlags},
			expected: ['推荐', '[answer] 推荐内容'],
		},
		{
			name: 'topic details',
			props: {
				browseType: 'topic' as const,
				query: 'topic-1',
				flags: baseFlags,
			},
			expected: ['话题详情', 'AI 话题', '话题介绍', '9'],
		},
		{
			name: 'user profile',
			props: {
				browseType: 'user-info' as const,
				query: 'openai',
				flags: baseFlags,
			},
			expected: ['用户信息', 'OpenAI', '研究组织', '1', '2', '3'],
		},
		{
			name: 'user answers',
			props: {
				browseType: 'user-answers' as const,
				query: 'openai',
				flags: baseFlags,
			},
			expected: ['openai 的回答', '回答问题'],
		},
		{
			name: 'user articles',
			props: {
				browseType: 'user-articles' as const,
				query: 'openai',
				flags: baseFlags,
			},
			expected: ['openai 的文章', '文章标题'],
		},
	])('renders $name', async ({props, expected, verify}) => {
		const view = render(<BrowseCommand {...props} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		for (const text of expected) {
			expect(frame).toContain(text);
		}

		verify?.();
	});

	it('shows the empty state when no results are returned', async () => {
		mocks.api.search.mockResolvedValue({items: []});

		const view = render(
			<BrowseCommand browseType="search" query="empty" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('搜索: empty');
		expect(frame).toContain('无结果');
	});

	it('shows the error state when fetching browse data fails', async () => {
		mocks.api.search.mockRejectedValue(new Error('浏览失败'));

		const view = render(
			<BrowseCommand browseType="search" query="broken" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('浏览失败');
		expect(frame).toContain('请检查参数或运行 zget login 登录后重试');
	});

	it('formats large zhihu counters using wan and yi units', async () => {
		mocks.api.getQuestion.mockResolvedValue({
			title: '大数字问题',
			detail: '详情',
			answer_count: 12_000,
			follower_count: 100_000_000,
			visit_count: 1234,
		});

		const view = render(
			<BrowseCommand browseType="question" query="big" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('1.2万');
		expect(frame).toContain('1.0亿');
		expect(frame).toContain('1234');
	});

	it('falls back to secondary zhihu fields when primary data is missing', async () => {
		mocks.api.search.mockResolvedValue({
			items: [{name: '备用名称', excerpt: '备用摘要'}],
		});
		mocks.api.getHotList.mockResolvedValue([{title: '备用热榜标题'}]);
		mocks.api.getAnswer.mockResolvedValue({
			content: '无作者回答',
			voteup_count: 1,
			comment_count: 2,
		});
		mocks.api.getUserProfile.mockResolvedValue({
			name: '匿名用户',
			headline: '',
			answerCount: 0,
			articlesCount: 0,
			followerCount: 0,
		});
		mocks.api.getUserArticles.mockResolvedValue({
			items: [{id: 42}],
		});

		const searchView = render(
			<BrowseCommand browseType="search" query="fallback" flags={baseFlags} />,
		);
		await flushAsync();
		expect(searchView.lastFrame()).toContain('备用名称  备用摘要');

		const hotView = render(
			<BrowseCommand browseType="hot" query="ignored" flags={baseFlags} />,
		);
		await flushAsync();
		expect(hotView.lastFrame()).toContain('备用热榜标题');

		const answerView = render(
			<BrowseCommand browseType="answer" query="fallback" flags={baseFlags} />,
		);
		await flushAsync();
		expect(answerView.lastFrame()).toContain('Unknown');

		const userView = render(
			<BrowseCommand
				browseType="user-info"
				query="fallback-user"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(userView.lastFrame()).toContain('-');

		const articlesView = render(
			<BrowseCommand
				browseType="user-articles"
				query="fallback-user"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(articlesView.lastFrame()).toContain('42');
	});

	it('surfaces unsupported browse types as errors', async () => {
		const view = render(
			<BrowseCommand
				browseType={'unsupported' as never}
				query="bad"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Unsupported browse type');
		expect(frame).toContain('请检查参数或运行 zget login 登录后重试');
	});
});
