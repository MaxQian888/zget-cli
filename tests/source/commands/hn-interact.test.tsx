import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import HnInteractCommand from '../../../source/commands/hn-interact';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		upvote: vi.fn(),
		unvote: vi.fn(),
		favorite: vi.fn(),
		unfavorite: vi.fn(),
		comment: vi.fn(),
		delete: vi.fn(),
	},
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
	HnApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.api.upvote.mockResolvedValue({
		success: true,
		action: 'upvote',
		target: '1',
	});
	mocks.api.comment.mockResolvedValue({
		success: true,
		action: 'comment',
		target: '1',
	});
	mocks.api.delete.mockResolvedValue({
		success: true,
		action: 'delete',
		target: '1',
	});
});

describe('HnInteractCommand', () => {
	it('upvote success renders ✓ message', async () => {
		const view = render(
			<HnInteractCommand
				interactType="hn-upvote"
				target="1"
				flags={baseFlags}
				format="human"
			/>,
		);
		await flushAsync();
		expect(mocks.api.upvote).toHaveBeenCalledWith('1');
		expect(view.lastFrame()).toContain('upvote');
	});

	it('refuses to operate without a target', async () => {
		const view = render(
			<HnInteractCommand
				interactType="hn-upvote"
				target=""
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('需要一个 item ID');
	});

	it('refuses comment without --text', async () => {
		const view = render(
			<HnInteractCommand
				interactType="hn-comment"
				target="1"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('--text');
	});

	it('refuses delete without --yes', async () => {
		const view = render(
			<HnInteractCommand
				interactType="hn-delete"
				target="42"
				flags={baseFlags}
				isConfirmed={false}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('--yes');
		expect(mocks.api.delete).not.toHaveBeenCalled();
	});

	it('delete with --yes proceeds and emits JSON envelope', async () => {
		const view = render(
			<HnInteractCommand
				isConfirmed
				interactType="hn-delete"
				target="42"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.delete).toHaveBeenCalledWith('42');
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it.each([
		['hn-unvote' as const, 'unvote'],
		['hn-favorite' as const, 'favorite'],
		['hn-unfavorite' as const, 'unfavorite'],
	])('%s routes to api.%s', async (interactType, method) => {
		(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[
			method
		].mockResolvedValue({
			success: true,
			action: method,
			target: '1',
		});
		const view = render(
			<HnInteractCommand
				interactType={interactType}
				target="1"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(
			(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[method],
		).toHaveBeenCalledWith('1');
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('comment routes to api.comment with the text', async () => {
		mocks.api.comment.mockResolvedValue({
			success: true,
			action: 'comment',
			target: '1',
		});
		const view = render(
			<HnInteractCommand
				interactType="hn-comment"
				target="1"
				text="hello"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.comment).toHaveBeenCalledWith('1', 'hello');
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('NOPERM is surfaced when not authenticated', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<HnInteractCommand
				interactType="hn-upvote"
				target="1"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"code": 77');
	});
});
