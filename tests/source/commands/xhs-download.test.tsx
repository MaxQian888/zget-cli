import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import XhsDownloadCommand from '../../../source/commands/xhs-download';
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
	api: {
		init: vi.fn(),
		close: vi.fn(),
	},
	downloadXhsNote: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/xhs-auth', () => ({
	XhsCookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/xhs-api', () => ({
	XhsApi: class MockXhsApi {
		constructor() {
			return mocks.api;
		}
	},
}));

vi.mock('../../../source/core/downloader/platforms/xhs-downloader', () => ({
	downloadXhsNote: mocks.downloadXhsNote,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.api.init.mockResolvedValue(undefined);
	mocks.api.close.mockResolvedValue(undefined);
	mocks.downloadXhsNote.mockResolvedValue(
		createDownloadResult({title: '小红书笔记'}),
	);
});

describe('XhsDownloadCommand', () => {
	it('renders progress first and then shows the note preview', async () => {
		const view = render(
			<XhsDownloadCommand
				noteId="note-123"
				flags={{...baseFlags, cookies: 'a1=token; web_session=session'}}
			/>,
		);

		expect(view.lastFrame()).toContain('zget - 下载小红书笔记');
		expect(view.lastFrame()).toContain('初始化...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 下载完成');
		expect(frame).toContain('小红书笔记');
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'a1=token; web_session=session',
		);
		expect(mocks.api.init).toHaveBeenCalled();
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('shows login guidance when note download fails', async () => {
		mocks.downloadXhsNote.mockRejectedValue(new Error('笔记下载失败'));

		const view = render(
			<XhsDownloadCommand noteId="note-123" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('笔记下载失败');
		expect(frame).toContain('运行 "zget xhs login" 登录后重试');
		expect(mocks.api.close).toHaveBeenCalled();
	});
});
