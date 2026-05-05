import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import XhsInteractCommand from '../../../source/commands/xhs-interact';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	api: {
		init: vi.fn(),
		close: vi.fn(),
		likeNote: vi.fn(),
		unlikeNote: vi.fn(),
		favoriteNote: vi.fn(),
		unfavoriteNote: vi.fn(),
		postComment: vi.fn(),
		deleteNote: vi.fn(),
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
	mocks.api.init.mockResolvedValue(undefined);
	mocks.api.close.mockResolvedValue(undefined);
	mocks.api.likeNote.mockResolvedValue(undefined);
	mocks.api.unlikeNote.mockResolvedValue(undefined);
	mocks.api.favoriteNote.mockResolvedValue(undefined);
	mocks.api.unfavoriteNote.mockResolvedValue(undefined);
	mocks.api.postComment.mockResolvedValue(undefined);
	mocks.api.deleteNote.mockResolvedValue(undefined);
});

describe('XhsInteractCommand', () => {
	it.each([
		{
			name: 'likes a note',
			props: {interactType: 'xhs-like', target: 'note-1'},
			expected: '已点赞笔记 note-1',
		},
		{
			name: 'unlikes a note',
			props: {interactType: 'xhs-unlike', target: 'note-2'},
			expected: '已取消点赞笔记 note-2',
		},
		{
			name: 'favorites a note',
			props: {interactType: 'xhs-favorite', target: 'note-3'},
			expected: '已收藏笔记 note-3',
		},
		{
			name: 'unfavorites a note',
			props: {interactType: 'xhs-unfavorite', target: 'note-4'},
			expected: '已取消收藏笔记 note-4',
		},
		{
			name: 'comments on a note',
			props: {
				interactType: 'xhs-comment',
				target: 'note-5',
				text: 'nice post',
			},
			expected: '已评论笔记 note-5',
		},
		{
			name: 'deletes a note',
			props: {interactType: 'xhs-delete', target: 'note-6'},
			expected: '已删除笔记 note-6',
		},
	])('$name', async ({props, expected}) => {
		const view = render(<XhsInteractCommand {...props} flags={baseFlags} />);

		expect(view.lastFrame()).toContain('正在处理...');

		await flushAsync();

		expect(view.lastFrame()).toContain(expected);
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('renders raw json output when requested', async () => {
		const view = render(
			<XhsInteractCommand
				interactType="xhs-like"
				target="note-json"
				flags={baseFlags}
				format="json"
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"success": true');
		expect(frame).toContain('"action": "xhs-like"');
		expect(frame).toContain('"target": "note-json"');
	});

	it('emits a structured json failure when an action rejects', async () => {
		mocks.api.likeNote.mockRejectedValue(new Error('Permission denied'));

		const view = render(
			<XhsInteractCommand
				interactType="xhs-like"
				target="note-fail"
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
		expect(parsed.error.code).toBe(77);
		expect(parsed.error.message).toBe('Permission denied');
	});

	it('shows an error when comment text is missing', async () => {
		const view = render(
			<XhsInteractCommand
				interactType="xhs-comment"
				target="note-7"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('请提供评论内容');
		expect(frame).toContain('运行 "zget xhs login" 登录后重试');
		expect(mocks.api.close).toHaveBeenCalled();
	});
});
