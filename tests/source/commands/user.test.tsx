import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import UserCommand from '../../../source/commands/user';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	parseZhihuUrl: vi.fn(),
	downloadUserContent: vi.fn(),
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
			return {kind: 'api'};
		}
	},
}));

vi.mock('../../../source/core/utils/url-parser', () => ({
	parseZhihuUrl: mocks.parseZhihuUrl,
}));

vi.mock('../../../source/core/downloader/user-downloader', () => ({
	downloadUserContent: mocks.downloadUserContent,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(true);
	mocks.parseZhihuUrl.mockReturnValue({
		platform: 'zhihu',
		type: 'user',
		userId: 'coder',
	});
});

describe('UserCommand', () => {
	it('shows user batch progress and summary after the download finishes', async () => {
		mocks.downloadUserContent.mockImplementation(
			async (_userId: string, _api: unknown, options) => {
				options.onBatchProgress({
					completed: 1,
					failed: 0,
					total: 2,
					currentItem: '回答 1',
				});

				return {
					userName: 'OpenAI',
					success: 1,
					failed: 0,
				};
			},
		);

		const view = render(
			<UserCommand
				url="https://www.zhihu.com/people/coder"
				flags={{...baseFlags, cookies: 'z_c0=token'}}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载用户内容');
		expect(view.lastFrame()).toContain('初始化...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('回答 1');
		expect(frame).toContain('✓ 批量下载完成');
		expect(frame).toContain('OpenAI');
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'z_c0=token',
		);
	});

	it('renders the login guidance when the user content download fails', async () => {
		mocks.downloadUserContent.mockRejectedValue(new Error('用户下载失败'));

		const view = render(
			<UserCommand
				url="https://www.zhihu.com/people/coder"
				flags={baseFlags}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载用户内容');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('用户下载失败');
		expect(frame).toContain('请检查用户链接是否正确');
	});
});
