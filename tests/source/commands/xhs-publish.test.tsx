import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import XhsPublishCommand from '../../../source/commands/xhs-publish';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		init: vi.fn(),
		close: vi.fn(),
		publishImageNote: vi.fn(),
	},
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

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.api.init.mockResolvedValue(undefined);
	mocks.api.close.mockResolvedValue(undefined);
	mocks.api.publishImageNote.mockResolvedValue({noteId: 'note-123'});
});

describe('XhsPublishCommand', () => {
	it('renders loading first and then shows the publish success message', async () => {
		const view = render(
			<XhsPublishCommand
				title="测试笔记"
				content="正文"
				images={['a.png']}
				flags={{...baseFlags, cookies: 'a1=token'}}
			/>,
		);

		expect(view.lastFrame()).toContain('正在发布笔记...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 笔记已发布 (ID: note-123)');
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'a1=token',
		);
		expect(mocks.api.publishImageNote).toHaveBeenCalledWith(
			'测试笔记',
			'正文',
			['a.png'],
		);
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('renders raw json output when requested', async () => {
		const view = render(
			<XhsPublishCommand title="JSON 笔记" flags={baseFlags} format="json" />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"noteId": "note-123"');
	});

	it('shows the auth error when the creator session is missing', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);

		const view = render(
			<XhsPublishCommand title="失败笔记" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('未登录，请先运行 "zget xhs login"');
		expect(frame).toContain('请确保已登录创作者中心');
	});

	it('emits a structured json failure when the publish call rejects', async () => {
		mocks.api.publishImageNote.mockRejectedValue(new Error('图片上传超时'));

		const view = render(
			<XhsPublishCommand
				title="失败笔记"
				images={['x.jpg']}
				flags={baseFlags}
				format="json"
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		const parsed = JSON.parse(frame) as {
			ok: boolean;
			error: {code: number; message: string};
		};
		expect(parsed.ok).toBe(false);
		expect(parsed.error.message).toBe('图片上传超时');
		expect(parsed.error.code).toBe(75);
	});
});
