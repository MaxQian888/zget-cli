import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import WeiboInteractCommand from '../../../source/commands/weibo-interact';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	api: {
		like: vi.fn(),
		unlike: vi.fn(),
		repost: vi.fn(),
		comment: vi.fn(),
		destroy: vi.fn(),
		follow: vi.fn(),
		unfollow: vi.fn(),
		getStatus: vi.fn(),
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
	mocks.api.like.mockResolvedValue({
		success: true,
		action: 'like',
		target: 'x',
	});
	mocks.api.unlike.mockResolvedValue({
		success: true,
		action: 'unlike',
		target: 'x',
	});
	mocks.api.repost.mockResolvedValue({
		success: true,
		action: 'repost',
		target: 'x',
	});
	mocks.api.comment.mockResolvedValue({
		success: true,
		action: 'comment',
		target: 'x',
	});
	mocks.api.destroy.mockResolvedValue({
		success: true,
		action: 'delete',
		target: 'x',
	});
	mocks.api.follow.mockResolvedValue({
		success: true,
		action: 'follow',
		target: 'u',
	});
	mocks.api.unfollow.mockResolvedValue({
		success: true,
		action: 'unfollow',
		target: 'u',
	});
	mocks.api.getStatus.mockResolvedValue({idstr: 'x', mid: 'x'});
});

describe('WeiboInteractCommand', () => {
	it('likes a status', async () => {
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-like"
				target="x"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('已点赞微博');
	});

	it('unlikes a status', async () => {
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-unlike"
				target="x"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('已取消点赞');
	});

	it('reposts a status', async () => {
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-repost"
				target="x"
				text="转发了"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('已转发微博');
		expect(mocks.api.repost).toHaveBeenCalledWith('x', 'x', '转发了');
	});

	it('comments on a status', async () => {
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-comment"
				target="x"
				text="hello"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('已评论微博');
	});

	it('errors when comment text is missing', async () => {
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-comment"
				target="x"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('缺少评论内容');
	});

	it('deletes a status', async () => {
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-delete"
				target="m"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('已删除微博');
	});

	it('follows + unfollows', async () => {
		const f = render(
			<WeiboInteractCommand
				interactType="weibo-follow"
				target="u"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(f.lastFrame()).toContain('已关注用户');

		const u = render(
			<WeiboInteractCommand
				interactType="weibo-unfollow"
				target="u"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(u.lastFrame()).toContain('已取消关注');
	});

	it('emits json envelope on success', async () => {
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-like"
				target="x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('emits json envelope on failure', async () => {
		mocks.api.like.mockRejectedValue(new Error('nope'));
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-like"
				target="x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"ok": false');
		expect(frame).toContain('nope');
	});

	it('shows error display in human mode', async () => {
		mocks.api.like.mockRejectedValue(new Error('nope'));
		const view = render(
			<WeiboInteractCommand
				interactType="weibo-like"
				target="x"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('nope');
	});

	it('rejects unknown interact type', async () => {
		const view = render(
			<WeiboInteractCommand
				interactType={'weibo-unknown' as never}
				target="x"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('Unsupported');
	});
});
