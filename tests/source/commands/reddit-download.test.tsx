import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import RedditDownloadCommand from '../../../source/commands/reddit-download';
import {
	baseFlags,
	createDownloadResult,
	flushAsync,
	setupCommandTestHarness,
} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credStore: {
		load: vi.fn(),
	},
	downloadRedditPost: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/reddit-auth', () => ({
	RedditCredentialStore: class {
		constructor() {
			return mocks.credStore;
		}
	},
}));

vi.mock('../../../source/core/api/reddit-api', () => ({
	RedditApi: class {},
}));

vi.mock('../../../source/core/downloader/platforms/reddit-downloader', () => ({
	downloadRedditPost: mocks.downloadRedditPost,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.credStore.load.mockResolvedValue(undefined);
	mocks.downloadRedditPost.mockResolvedValue(createDownloadResult());
});

describe('RedditDownloadCommand', () => {
	it('renders preview after successful download', async () => {
		const view = render(
			<RedditDownloadCommand
				postId="abc"
				subreddit="programming"
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.downloadRedditPost).toHaveBeenCalledWith(
			'abc',
			expect.anything(),
			expect.objectContaining({
				outputDir: './downloads',
				subreddit: 'programming',
			}),
		);
		expect(view.lastFrame()).toContain('测试标题');
	});

	it('renders error display when download throws', async () => {
		mocks.downloadRedditPost.mockRejectedValue(new Error('net down'));
		const view = render(
			<RedditDownloadCommand postId="abc" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('net down');
	});

	it('shows initial progress UI before resolution', async () => {
		mocks.downloadRedditPost.mockReturnValue(new Promise(() => {}));
		const view = render(
			<RedditDownloadCommand postId="abc" flags={baseFlags} />,
		);
		expect(view.lastFrame()).toContain('Reddit');
	});
});
