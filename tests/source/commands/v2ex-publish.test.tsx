import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import V2exPublishCommand from '../../../source/commands/v2ex-publish';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	tokenStore: {
		load: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		newTopic: vi.fn(),
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
});

describe('V2exPublishCommand', () => {
	it('publishes a new topic with node + title + body', async () => {
		mocks.api.newTopic.mockResolvedValue({
			topicId: 555,
			url: 'https://v2ex.com/t/555',
		});
		const view = render(
			<V2exPublishCommand
				node="go"
				text="Hello"
				content="World"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.newTopic).toHaveBeenCalledWith('go', 'Hello', 'World');
		expect(view.lastFrame()).toContain('"topicId": 555');
	});

	it('refuses without a node', async () => {
		const view = render(
			<V2exPublishCommand
				node=""
				text="Hello"
				content="World"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('节点');
	});

	it('refuses without --text', async () => {
		const view = render(
			<V2exPublishCommand
				node="go"
				text=""
				content="x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('--text');
	});

	it('refuses without --content', async () => {
		const view = render(
			<V2exPublishCommand
				node="go"
				text="t"
				content=""
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('--content');
	});

	it('NOPERM when not authenticated', async () => {
		mocks.tokenStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<V2exPublishCommand
				node="go"
				text="t"
				content="b"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"code": 77');
	});
});
