import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import BiliDownloadCommand from '../../../source/commands/bili-download';
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
	api: {},
	downloadBiliVideo: vi.fn(),
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

vi.mock('../../../source/core/downloader/platforms/bili-downloader', () => ({
	downloadBiliVideo: mocks.downloadBiliVideo,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.downloadBiliVideo.mockResolvedValue(
		createDownloadResult({title: 'Bilibili 视频'}),
	);
});

describe('BiliDownloadCommand', () => {
	it('renders progress first and then shows the bilibili preview', async () => {
		const view = render(
			<BiliDownloadCommand
				bvid="BV1xx411c7mD"
				flags={{...baseFlags, cookies: 'SESSDATA=value'}}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载 Bilibili 视频内容');
		expect(view.lastFrame()).toContain('初始化...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 下载完成');
		expect(frame).toContain('Bilibili 视频');
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'SESSDATA=value',
		);
		expect(mocks.downloadBiliVideo).toHaveBeenCalledWith(
			'BV1xx411c7mD',
			mocks.api,
			expect.objectContaining({
				outputDir: './downloads',
			}),
		);
	});

	it('shows a link validation error when bilibili download fails', async () => {
		mocks.downloadBiliVideo.mockRejectedValue(new Error('视频下载失败'));

		const view = render(
			<BiliDownloadCommand bvid="BV1xx411c7mD" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('视频下载失败');
		expect(frame).toContain('请检查视频链接是否正确');
	});
});
