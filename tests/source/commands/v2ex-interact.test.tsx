import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import V2exInteractCommand from '../../../source/commands/v2ex-interact';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	tokenStore: {
		load: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		collect: vi.fn(),
		uncollect: vi.fn(),
		thankTopic: vi.fn(),
		thankReply: vi.fn(),
		reply: vi.fn(),
		deleteReply: vi.fn(),
	},
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
	V2exApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.tokenStore.load.mockResolvedValue(undefined);
	mocks.tokenStore.isAuthenticated.mockReturnValue(true);
	mocks.api.collect.mockResolvedValue({
		success: true,
		action: 'collect',
		target: '1',
	});
	mocks.api.thankTopic.mockResolvedValue({
		success: true,
		action: 'thank-topic',
		target: '1',
	});
	mocks.api.reply.mockResolvedValue({
		success: true,
		action: 'reply',
		target: '1',
	});
	mocks.api.deleteReply.mockResolvedValue({
		success: true,
		action: 'delete-reply',
		target: '1',
	});
});

describe('V2exInteractCommand', () => {
	it.each([
		['v2ex-collect' as const, 'collect'],
		['v2ex-uncollect' as const, 'uncollect'],
		['v2ex-thank-topic' as const, 'thankTopic'],
		['v2ex-thank-reply' as const, 'thankReply'],
	])('%s routes to api.%s', async (interactType, method) => {
		(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[
			method
		].mockResolvedValue({
			success: true,
			action: method,
			target: '1',
		});
		const view = render(
			<V2exInteractCommand
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

	it('refuses to operate without a target', async () => {
		const view = render(
			<V2exInteractCommand
				interactType="v2ex-collect"
				target=""
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
	});

	it('refuses reply without --text', async () => {
		const view = render(
			<V2exInteractCommand
				interactType="v2ex-reply"
				target="1"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('--text');
	});

	it('reply with --text posts to api.reply', async () => {
		const view = render(
			<V2exInteractCommand
				interactType="v2ex-reply"
				target="1"
				text="hello"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.reply).toHaveBeenCalledWith('1', 'hello');
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('refuses delete-reply without --yes', async () => {
		const view = render(
			<V2exInteractCommand
				interactType="v2ex-delete-reply"
				target="1"
				flags={baseFlags}
				isConfirmed={false}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('--yes');
		expect(mocks.api.deleteReply).not.toHaveBeenCalled();
	});

	it('delete-reply with --yes proceeds', async () => {
		const view = render(
			<V2exInteractCommand
				isConfirmed
				interactType="v2ex-delete-reply"
				target="1"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.deleteReply).toHaveBeenCalledWith('1');
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('NOPERM is surfaced when not authenticated', async () => {
		mocks.tokenStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<V2exInteractCommand
				interactType="v2ex-collect"
				target="1"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"code": 77');
	});
});
