import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import TwitterDownloadCommand from '../../../source/commands/x-download';
import {
	baseFlags,
	createDownloadResult,
	flushAsync,
	setupCommandTestHarness,
} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credentialStore: {
		load: vi.fn(),
	},
	api: {
		parseTweetId: vi.fn(),
	},
	downloadTweet: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/x-auth', () => ({
	XCredentialStore: class MockCredentialStore {
		constructor() {
			return mocks.credentialStore;
		}
	},
}));

vi.mock('../../../source/core/api/x-api', () => ({
	XApi: class MockXApi {
		constructor() {
			return mocks.api;
		}
	},
}));

vi.mock('../../../source/core/downloader/platforms/x-downloader', () => ({
	downloadTweet: mocks.downloadTweet,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.credentialStore.load.mockResolvedValue(undefined);
	mocks.api.parseTweetId.mockReturnValue('1234567890');
	mocks.downloadTweet.mockResolvedValue(
		createDownloadResult({title: 'X 推文内容'}),
	);
});

describe('TwitterDownloadCommand', () => {
	it('renders progress first and then shows the tweet preview', async () => {
		const view = render(
			<TwitterDownloadCommand
				url="https://x.com/openai/status/1234567890"
				flags={baseFlags}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载 X 推文');
		expect(view.lastFrame()).toContain('初始化...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 下载完成');
		expect(frame).toContain('X 推文内容');
		expect(mocks.api.parseTweetId).toHaveBeenCalledWith(
			'https://x.com/openai/status/1234567890',
		);
		expect(mocks.downloadTweet).toHaveBeenCalledWith(
			'1234567890',
			mocks.api,
			expect.objectContaining({
				outputDir: './downloads',
			}),
		);
	});

	it('shows credential guidance when the tweet download fails', async () => {
		mocks.downloadTweet.mockRejectedValue(new Error('X 下载失败'));

		const view = render(
			<TwitterDownloadCommand
				url="https://x.com/openai/status/123"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('X 下载失败');
		expect(frame).toContain('请检查推文链接和 X API 凭证是否正确');
	});
});
