import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import DownloadCommand from '../../../source/commands/download';
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
	parseZhihuUrl: vi.fn(),
	downloadArticle: vi.fn(),
	downloadAnswer: vi.fn(),
	downloadVideo: vi.fn(),
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

vi.mock('../../../source/core/downloader/article-downloader', () => ({
	downloadArticle: mocks.downloadArticle,
}));

vi.mock('../../../source/core/downloader/answer-downloader', () => ({
	downloadAnswer: mocks.downloadAnswer,
}));

vi.mock('../../../source/core/downloader/video-downloader', () => ({
	downloadVideo: mocks.downloadVideo,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(true);
	mocks.downloadArticle.mockResolvedValue(
		createDownloadResult({title: '知乎文章标题'}),
	);
	mocks.downloadAnswer.mockResolvedValue(
		createDownloadResult({title: '知乎回答标题'}),
	);
	mocks.downloadVideo.mockResolvedValue(
		createDownloadResult({title: '知乎视频标题'}),
	);
});

describe('DownloadCommand', () => {
	it('renders article progress first and then shows the downloaded article preview', async () => {
		mocks.parseZhihuUrl.mockReturnValue({
			platform: 'zhihu',
			type: 'article',
			articleId: '12345',
		});

		const view = render(
			<DownloadCommand
				type="article"
				url="https://zhuanlan.zhihu.com/p/12345"
				flags={{...baseFlags, cookies: 'z_c0=token'}}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载知乎文章');
		expect(view.lastFrame()).toContain('初始化...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 下载完成');
		expect(frame).toContain('知乎文章标题');
		expect(mocks.downloadArticle).toHaveBeenCalledWith(
			'12345',
			expect.anything(),
			expect.objectContaining({
				outputDir: './downloads',
				downloadImages: true,
				verbose: false,
				onProgress: expect.any(Function),
			}),
		);
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'z_c0=token',
		);
	});

	it('shows a validation error for invalid answer links', async () => {
		mocks.parseZhihuUrl.mockReturnValue({
			platform: 'example',
			type: 'article',
		});

		const view = render(
			<DownloadCommand
				type="answer"
				url="https://example.com/answer"
				flags={baseFlags}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载知乎回答');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('无效的回答链接');
		expect(frame).toContain('请检查链接是否正确');
		expect(mocks.downloadAnswer).not.toHaveBeenCalled();
	});

	it('falls back to the raw url when downloading a video id directly', async () => {
		mocks.parseZhihuUrl.mockReturnValue({
			platform: 'example',
			type: 'video',
		});

		const view = render(
			<DownloadCommand type="video" url="98765" flags={baseFlags} />,
		);

		expect(view.lastFrame()).toContain('zget - 下载知乎视频');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('知乎视频标题');
		expect(mocks.downloadVideo).toHaveBeenCalledWith(
			'98765',
			expect.anything(),
			expect.anything(),
			expect.objectContaining({
				outputDir: './downloads',
			}),
		);
	});
});
