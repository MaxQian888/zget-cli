import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import HnDownloadCommand from '../../../source/commands/hn-download';
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
	downloadHnItem: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/hn-auth', () => ({
	HnCookieStore: class {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/hn-api', () => ({
	HnApi: class {},
}));

vi.mock('../../../source/core/downloader/platforms/hn-downloader', () => ({
	downloadHnItem: mocks.downloadHnItem,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.downloadHnItem.mockResolvedValue(createDownloadResult());
});

describe('HnDownloadCommand', () => {
	it('renders preview after successful download', async () => {
		const view = render(<HnDownloadCommand itemId="42" flags={baseFlags} />);
		await flushAsync();
		expect(mocks.downloadHnItem).toHaveBeenCalledWith(
			'42',
			expect.anything(),
			expect.objectContaining({outputDir: './downloads'}),
		);
		expect(view.lastFrame()).toContain('测试标题');
	});

	it('renders error display when download throws', async () => {
		mocks.downloadHnItem.mockRejectedValue(new Error('net down'));
		const view = render(<HnDownloadCommand itemId="42" flags={baseFlags} />);
		await flushAsync();
		expect(view.lastFrame()).toContain('net down');
	});

	it('shows initial progress UI before resolution', async () => {
		mocks.downloadHnItem.mockReturnValue(new Promise(() => {}));
		const view = render(<HnDownloadCommand itemId="42" flags={baseFlags} />);
		expect(view.lastFrame()).toContain('Hacker News');
	});
});
