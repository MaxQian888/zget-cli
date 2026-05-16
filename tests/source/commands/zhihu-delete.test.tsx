import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ZhihuDeleteCommand from '../../../source/commands/zhihu-delete';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		deleteQuestion: vi.fn(),
		deletePin: vi.fn(),
		deleteArticle: vi.fn(),
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
	mocks.api.deleteQuestion.mockResolvedValue(undefined);
	mocks.api.deletePin.mockResolvedValue(undefined);
	mocks.api.deleteArticle.mockResolvedValue(undefined);
});

describe('ZhihuDeleteCommand', () => {
	it('refuses to delete without -y in human format', async () => {
		const view = render(
			<ZhihuDeleteCommand
				kind="zhihu-delete-question"
				target="q-1"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.deleteQuestion).not.toHaveBeenCalled();
		expect(view.lastFrame()).toContain('不可逆');
	});

	it('deletes a question when -y is set', async () => {
		const view = render(
			<ZhihuDeleteCommand
				isConfirmed
				kind="zhihu-delete-question"
				target="q-2"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.deleteQuestion).toHaveBeenCalledWith('q-2');
		expect(view.lastFrame()).toContain('已删除问题 q-2');
	});

	it('deletes a pin when -y is set', async () => {
		render(
			<ZhihuDeleteCommand
				isConfirmed
				kind="zhihu-delete-pin"
				target="pin-1"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.deletePin).toHaveBeenCalledWith('pin-1');
	});

	it('deletes an article when -y is set', async () => {
		render(
			<ZhihuDeleteCommand
				isConfirmed
				kind="zhihu-delete-article"
				target="art-1"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.deleteArticle).toHaveBeenCalledWith('art-1');
	});

	it('emits envelope JSON on success when format=json', async () => {
		const view = render(
			<ZhihuDeleteCommand
				isConfirmed
				kind="zhihu-delete-question"
				target="q-3"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			data: {action: string; target: string};
		};
		expect(parsed.ok).toBe(true);
		expect(parsed.data.target).toBe('q-3');
	});

	it('JSON output skips the -y guard (programmatic use)', async () => {
		const view = render(
			<ZhihuDeleteCommand
				kind="zhihu-delete-pin"
				target="pin-2"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.deletePin).toHaveBeenCalledWith('pin-2');
		const parsed = JSON.parse(view.lastFrame() ?? '') as {ok: boolean};
		expect(parsed.ok).toBe(true);
	});

	it('emits envelope JSON on failure when format=json and not logged in', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<ZhihuDeleteCommand
				isConfirmed
				kind="zhihu-delete-article"
				target="art-2"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			error: {message: string};
		};
		expect(parsed.ok).toBe(false);
		expect(parsed.error.message).toContain('未登录');
	});

	it('applies --cookies override before the auth check', async () => {
		render(
			<ZhihuDeleteCommand
				isConfirmed
				kind="zhihu-delete-question"
				target="q-4"
				flags={{...baseFlags, cookies: 'z_c0=abc'}}
			/>,
		);
		await flushAsync();
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'z_c0=abc',
		);
	});

	it('surfaces API errors in human mode', async () => {
		mocks.api.deleteQuestion.mockRejectedValue(new Error('not allowed'));
		const view = render(
			<ZhihuDeleteCommand
				isConfirmed
				kind="zhihu-delete-question"
				target="q-5"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('not allowed');
	});
});
