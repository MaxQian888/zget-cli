import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ZhihuListCommand from '../../../source/commands/zhihu-list';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		getFollowers: vi.fn(),
		getFollowing: vi.fn(),
		getCollections: vi.fn(),
		getNotifications: vi.fn(),
		getDrafts: vi.fn(),
		listComments: vi.fn(),
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
	ApiClient: class MockApiClient {},
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
	mocks.cookieStore.load.mockResolvedValue(true);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.api.getFollowers.mockResolvedValue({
		items: [
			{id: 'u1', name: 'Alice', urlToken: 'alice', headline: 'hi'},
			{id: 'u2', name: 'Bob', urlToken: 'bob', headline: 'ho'},
		],
		paging: {isEnd: false, totals: 2},
	});
	mocks.api.getFollowing.mockResolvedValue({
		items: [{id: 'u3', name: 'Carol', urlToken: 'carol', headline: 'hey'}],
		paging: {isEnd: true, totals: 1},
	});
	mocks.api.getCollections.mockResolvedValue({
		items: [
			{id: 'c1', title: 'Reading list', answerCount: 5, followerCount: 2},
		],
		paging: {isEnd: true, totals: 1},
	});
	mocks.api.getNotifications.mockResolvedValue({
		items: [
			{id: 'n1', type: 'like', content: 'Alice liked your answer', read: false},
			{id: 'n2', type: 'comment', content: '', read: true},
		],
		paging: {isEnd: true, totals: 2},
	});
	mocks.api.getDrafts.mockResolvedValue({
		items: [{id: 'd1', title: 'My draft'}],
		paging: {isEnd: true, totals: 1},
	});
	mocks.api.listComments.mockResolvedValue({
		items: [
			{
				id: 'cm1',
				author: {name: 'Alice'},
				content: 'cool',
				likeCount: 3,
			},
		],
		paging: {isEnd: true, totals: 1},
	});
});

describe('ZhihuListCommand', () => {
	it('renders followers list with offset numbering', async () => {
		const view = render(
			<ZhihuListCommand
				kind="zhihu-followers"
				target="alice"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.getFollowers).toHaveBeenCalledWith('alice', 0, 20);
		expect(view.lastFrame()).toContain('Alice (@alice)');
		expect(view.lastFrame()).toContain('1.');
	});

	it('honors limit and offset', async () => {
		render(
			<ZhihuListCommand
				kind="zhihu-followers"
				target="alice"
				flags={baseFlags}
				limit={5}
				offset={10}
			/>,
		);
		await flushAsync();
		expect(mocks.api.getFollowers).toHaveBeenCalledWith('alice', 10, 5);
	});

	it('rejects missing target for follower lists', async () => {
		const view = render(
			<ZhihuListCommand kind="zhihu-followers" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('缺少');
		expect(mocks.api.getFollowers).not.toHaveBeenCalled();
	});

	it('renders following with the supplied target', async () => {
		render(
			<ZhihuListCommand
				kind="zhihu-following"
				target="alice"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.getFollowing).toHaveBeenCalledWith('alice', 0, 20);
	});

	it('renders collections summary line', async () => {
		const view = render(
			<ZhihuListCommand
				kind="zhihu-collections"
				target="alice"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('Reading list');
		expect(view.lastFrame()).toContain('答案');
	});

	it('renders notifications, falling back to type when content is empty', async () => {
		const view = render(
			<ZhihuListCommand kind="zhihu-notifications" flags={baseFlags} />,
		);
		await flushAsync();
		expect(mocks.api.getNotifications).toHaveBeenCalledWith(0, 20);
		expect(view.lastFrame()).toContain('Alice liked your answer');
		expect(view.lastFrame()).toContain('(comment)');
	});

	it('renders drafts', async () => {
		const view = render(
			<ZhihuListCommand kind="zhihu-drafts" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('My draft');
	});

	it('renders comments with author + body', async () => {
		const view = render(
			<ZhihuListCommand
				kind="zhihu-comments"
				target="ans-1"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.listComments).toHaveBeenCalledWith(
			'answer',
			'ans-1',
			0,
			20,
		);
		expect(view.lastFrame()).toContain('Alice: cool');
	});

	it('rejects comments without a target', async () => {
		const view = render(
			<ZhihuListCommand kind="zhihu-comments" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('缺少');
	});

	it('shows empty state when the listing is empty', async () => {
		mocks.api.getDrafts.mockResolvedValue({
			items: [],
			paging: {isEnd: true, totals: 0},
		});
		const view = render(
			<ZhihuListCommand kind="zhihu-drafts" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('(空)');
	});

	it('emits envelope JSON when format=json', async () => {
		const view = render(
			<ZhihuListCommand kind="zhihu-drafts" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			data: unknown;
		};
		expect(parsed.ok).toBe(true);
		expect(parsed.data).toBeDefined();
	});

	it('emits envelope JSON on failure when not authenticated', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<ZhihuListCommand kind="zhihu-drafts" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			error: {message: string};
		};
		expect(parsed.ok).toBe(false);
		expect(parsed.error.message).toContain('未登录');
	});

	it('applies --cookies override before authenticating', async () => {
		render(
			<ZhihuListCommand
				kind="zhihu-drafts"
				flags={{...baseFlags, cookies: 'z_c0=abc'}}
			/>,
		);
		await flushAsync();
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'z_c0=abc',
		);
	});

	it('forwards a commentTarget override to listComments', async () => {
		render(
			<ZhihuListCommand
				kind="zhihu-comments"
				target="art-1"
				commentTarget="article"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.listComments).toHaveBeenCalledWith(
			'article',
			'art-1',
			0,
			20,
		);
	});

	it('surfaces API errors in human mode', async () => {
		mocks.api.getFollowers.mockRejectedValue(new Error('throttled'));
		const view = render(
			<ZhihuListCommand
				kind="zhihu-followers"
				target="alice"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('throttled');
	});
});
