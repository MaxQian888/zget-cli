import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ColumnCommand from '../../../source/commands/column';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	parseZhihuUrl: vi.fn(),
	downloadColumn: vi.fn(),
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

vi.mock('../../../source/core/downloader/column-downloader', () => ({
	downloadColumn: mocks.downloadColumn,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(true);
	mocks.parseZhihuUrl.mockReturnValue({
		platform: 'zhihu',
		type: 'column',
		columnId: 'ai-weekly',
	});
});

describe('ColumnCommand', () => {
	it('renders progress first and then shows batch completion details', async () => {
		mocks.downloadColumn.mockImplementation(
			async (_columnId: string, _api: unknown, _client: unknown, options) => {
				options.onBatchProgress({
					completed: 1,
					failed: 0,
					total: 1,
					currentItem: '第 1 篇',
				});

				return {
					folderName: 'AI Weekly',
					success: 1,
					failed: 0,
				};
			},
		);

		const view = render(
			<ColumnCommand
				url="https://zhuanlan.zhihu.com/ai-weekly"
				flags={{...baseFlags, cookies: 'z_c0=token'}}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载知乎专栏');
		expect(view.lastFrame()).toContain('初始化...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('第 1 篇');
		expect(frame).toContain('✓ 批量下载完成');
		expect(frame).toContain('AI Weekly');
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'z_c0=token',
		);
	});

	it('shows an actionable error when the column download fails', async () => {
		mocks.downloadColumn.mockRejectedValue(new Error('专栏下载失败'));

		const view = render(
			<ColumnCommand url="https://zhuanlan.zhihu.com/boom" flags={baseFlags} />,
		);

		expect(view.lastFrame()).toContain('zget - 下载知乎专栏');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('专栏下载失败');
		expect(frame).toContain('请检查专栏链接是否正确');
	});
});
