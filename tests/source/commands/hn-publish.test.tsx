import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import HnPublishCommand from '../../../source/commands/hn-publish';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		submit: vi.fn(),
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
});

describe('HnPublishCommand', () => {
	it('submits a URL story when --content is a URL', async () => {
		mocks.api.submit.mockResolvedValue({
			itemId: 555,
			url: 'item?id=555',
		});
		const view = render(
			<HnPublishCommand
				text="Hello"
				content="https://example.com"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.submit).toHaveBeenCalledWith(
			'Hello',
			'https://example.com',
			{asText: false},
		);
		expect(view.lastFrame()).toContain('"itemId": 555');
		expect(view.lastFrame()).toContain('"kind": "url"');
	});

	it('submits a text story when --content is plain text', async () => {
		mocks.api.submit.mockResolvedValue({itemId: 1, url: 'item?id=1'});
		const view = render(
			<HnPublishCommand
				text="Ask HN: ?"
				content="some text body"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.submit).toHaveBeenCalledWith(
			'Ask HN: ?',
			'some text body',
			{asText: true},
		);
		expect(view.lastFrame()).toContain('"kind": "text"');
	});

	it('refuses to submit without --text', async () => {
		const view = render(
			<HnPublishCommand
				text=""
				content="https://x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(mocks.api.submit).not.toHaveBeenCalled();
	});

	it('refuses to submit without --content', async () => {
		const view = render(
			<HnPublishCommand
				text="title"
				content=""
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('--content');
	});

	it('NOPERM when not authenticated', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<HnPublishCommand
				text="t"
				content="https://x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"code": 77');
	});
});
