import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ZhihuInteractCommand from '../../../source/commands/zhihu-interact';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		voteAnswer: vi.fn(),
		follow: vi.fn(),
		unfollow: vi.fn(),
		createComment: vi.fn(),
		deleteComment: vi.fn(),
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
	mocks.api.voteAnswer.mockResolvedValue(undefined);
	mocks.api.follow.mockResolvedValue(undefined);
	mocks.api.unfollow.mockResolvedValue(undefined);
	mocks.api.createComment.mockResolvedValue({id: 'c-100', type: 'comment'});
	mocks.api.deleteComment.mockResolvedValue(true);
});

describe('ZhihuInteractCommand', () => {
	it('votes up an answer', async () => {
		const view = render(
			<ZhihuInteractCommand
				kind="zhihu-vote"
				target="ans-1"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.voteAnswer).toHaveBeenCalledWith('ans-1', 'up');
		expect(view.lastFrame()).toContain('已赞同回答 ans-1');
	});

	it('cancels a vote when neutral=true', async () => {
		const view = render(
			<ZhihuInteractCommand
				isNeutral
				kind="zhihu-vote"
				target="ans-2"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.voteAnswer).toHaveBeenCalledWith('ans-2', 'neutral');
		expect(view.lastFrame()).toContain('已取消');
	});

	it('follows a user, question, or column', async () => {
		render(
			<ZhihuInteractCommand
				kind="zhihu-follow"
				target="alice"
				followTarget="user"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.follow).toHaveBeenCalledWith('user', 'alice');
	});

	it('unfollow uses the unfollow API method', async () => {
		render(
			<ZhihuInteractCommand
				kind="zhihu-unfollow"
				target="999"
				followTarget="question"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.unfollow).toHaveBeenCalledWith('question', '999');
	});

	it('comments on an answer with text and reply target', async () => {
		render(
			<ZhihuInteractCommand
				kind="zhihu-comment"
				target="ans-3"
				commentTarget="answer"
				text="hi"
				reply="c-1"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.createComment).toHaveBeenCalledWith(
			'answer',
			'ans-3',
			'hi',
			'c-1',
		);
	});

	it('errors when comment kind is missing text', async () => {
		const view = render(
			<ZhihuInteractCommand
				kind="zhihu-comment"
				target="ans-4"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('请提供评论内容');
	});

	it('emits an envelope JSON success', async () => {
		const view = render(
			<ZhihuInteractCommand
				kind="zhihu-vote"
				target="ans-json"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			data: Record<string, unknown>;
		};
		expect(parsed.ok).toBe(true);
		expect(parsed.data.action).toBe('zhihu-vote');
		expect(parsed.data.target).toBe('ans-json');
		expect(parsed.data.voteType).toBe('up');
	});

	it('emits an envelope JSON failure on auth error', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<ZhihuInteractCommand
				kind="zhihu-vote"
				target="ans-fail"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			error: {code: number; message: string};
		};
		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe(77);
		expect(parsed.error.message).toContain('未登录');
	});
});
