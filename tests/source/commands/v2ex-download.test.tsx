import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import V2exDownloadCommand from '../../../source/commands/v2ex-download';
import {
	baseFlags,
	createDownloadResult,
	flushAsync,
	setupCommandTestHarness,
} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	tokenStore: {
		load: vi.fn(),
	},
	downloadV2exTopic: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/v2ex-auth', () => ({
	V2exTokenStore: class {
		constructor() {
			return mocks.tokenStore;
		}
	},
}));

vi.mock('../../../source/core/api/v2ex-api', () => ({
	V2exApi: class {},
}));

vi.mock('../../../source/core/downloader/platforms/v2ex-downloader', () => ({
	downloadV2exTopic: mocks.downloadV2exTopic,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.tokenStore.load.mockResolvedValue(undefined);
	mocks.downloadV2exTopic.mockResolvedValue(createDownloadResult());
});

describe('V2exDownloadCommand', () => {
	it('renders preview after successful download', async () => {
		const view = render(
			<V2exDownloadCommand topicId="123" flags={baseFlags} />,
		);
		await flushAsync();
		expect(mocks.downloadV2exTopic).toHaveBeenCalledWith(
			'123',
			expect.anything(),
			expect.objectContaining({outputDir: './downloads'}),
		);
		expect(view.lastFrame()).toContain('测试标题');
	});

	it('renders error display when download throws', async () => {
		mocks.downloadV2exTopic.mockRejectedValue(new Error('net down'));
		const view = render(
			<V2exDownloadCommand topicId="123" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('net down');
	});

	it('shows initial progress UI before resolution', async () => {
		mocks.downloadV2exTopic.mockReturnValue(new Promise(() => {}));
		const view = render(
			<V2exDownloadCommand topicId="123" flags={baseFlags} />,
		);
		expect(view.lastFrame()).toContain('V2EX');
	});
});
