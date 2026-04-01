import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import PlatformDownloadCommand from '../../../source/commands/platform-download';
import {
	baseFlags,
	createDownloadResult,
	flushAsync,
	setupCommandTestHarness,
} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	downloadCsdnArticle: vi.fn(),
	downloadCsdnCategory: vi.fn(),
	isCsdnCategory: vi.fn(),
	downloadWeixinArticle: vi.fn(),
	downloadJuejinArticle: vi.fn(),
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

vi.mock('../../../source/core/downloader/platforms/csdn-downloader', () => ({
	downloadCsdnArticle: mocks.downloadCsdnArticle,
	downloadCsdnCategory: mocks.downloadCsdnCategory,
	isCsdnCategory: mocks.isCsdnCategory,
}));

vi.mock('../../../source/core/downloader/platforms/weixin-downloader', () => ({
	downloadWeixinArticle: mocks.downloadWeixinArticle,
}));

vi.mock('../../../source/core/downloader/platforms/juejin-downloader', () => ({
	downloadJuejinArticle: mocks.downloadJuejinArticle,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(true);
	mocks.isCsdnCategory.mockReturnValue(false);
	mocks.downloadWeixinArticle.mockResolvedValue(
		createDownloadResult({title: '公众号文章'}),
	);
	mocks.downloadJuejinArticle.mockResolvedValue(
		createDownloadResult({title: '掘金文章'}),
	);
	mocks.downloadCsdnArticle.mockResolvedValue(
		createDownloadResult({title: 'CSDN 文章'}),
	);
});

describe('PlatformDownloadCommand', () => {
	it('renders article progress first and then shows the single article preview', async () => {
		const view = render(
			<PlatformDownloadCommand
				platform="weixin"
				url="https://mp.weixin.qq.com/s/demo"
				flags={{...baseFlags, cookies: 'session=value'}}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载 微信公众号 文章');
		expect(view.lastFrame()).toContain('初始化...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 下载完成');
		expect(frame).toContain('公众号文章');
		expect(mocks.downloadWeixinArticle).toHaveBeenCalledWith(
			'https://mp.weixin.qq.com/s/demo',
			expect.anything(),
			expect.objectContaining({
				outputDir: './downloads',
			}),
		);
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'session=value',
		);
	});

	it('shows batch progress for CSDN category downloads', async () => {
		mocks.downloadCsdnCategory.mockImplementation(
			async (_url, _client, options) => {
				options.onBatchProgress({
					completed: 2,
					failed: 0,
					total: 2,
					currentItem: '第 2 篇',
				});

				return {
					folderName: 'CSDN 专栏',
					success: 2,
					failed: 0,
				};
			},
		);

		const view = render(
			<PlatformDownloadCommand
				isBatch
				platform="csdn"
				url="https://blog.csdn.net/demo"
				flags={baseFlags}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载 CSDN 文章');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('zget - 下载 CSDN 专栏');
		expect(frame).toContain('第 2 篇');
		expect(frame).toContain('✓ 批量下载完成');
		expect(frame).toContain('CSDN 专栏');
	});

	it('surfaces unsupported platforms as errors', async () => {
		const view = render(
			<PlatformDownloadCommand
				platform={'medium' as never}
				url="https://medium.com/post"
				flags={baseFlags}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载 medium 文章');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('不支持的平台: medium');
		expect(frame).toContain('请检查 medium 链接是否正确');
	});
});
