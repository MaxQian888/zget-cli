import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import WeiboDownloadCommand from '../../../source/commands/weibo-download';
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
	downloadWeiboStatus: vi.fn(),
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
	WeiboApi: class {},
}));

vi.mock('../../../source/core/downloader/platforms/weibo-downloader', () => ({
	downloadWeiboStatus: mocks.downloadWeiboStatus,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.downloadWeiboStatus.mockResolvedValue(createDownloadResult());
});

describe('WeiboDownloadCommand', () => {
	it('renders preview after successful download', async () => {
		const view = render(
			<WeiboDownloadCommand idstr="abc123" flags={baseFlags} />,
		);
		await flushAsync();
		expect(mocks.downloadWeiboStatus).toHaveBeenCalledWith(
			'abc123',
			expect.anything(),
			expect.objectContaining({outputDir: './downloads'}),
		);
		expect(view.lastFrame()).toContain('测试标题');
	});

	it('renders error display when download throws', async () => {
		mocks.downloadWeiboStatus.mockRejectedValue(new Error('net down'));
		const view = render(<WeiboDownloadCommand idstr="abc" flags={baseFlags} />);
		await flushAsync();
		expect(view.lastFrame()).toContain('net down');
	});

	it('shows initial progress UI before resolution', async () => {
		mocks.downloadWeiboStatus.mockReturnValue(new Promise(() => {}));
		const view = render(<WeiboDownloadCommand idstr="abc" flags={baseFlags} />);
		expect(view.lastFrame()).toContain('zget - 下载微博内容');
	});
});
