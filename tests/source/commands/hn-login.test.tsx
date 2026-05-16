import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import HnLoginCommand from '../../../source/commands/hn-login';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		save: vi.fn(),
		clear: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
		getUsername: vi.fn(),
	},
	api: {
		getMyProfile: vi.fn(),
	},
	performHnBrowserLogin: vi.fn(),
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

vi.mock('../../../source/core/api/hn-browser', () => ({
	performHnBrowserLogin: mocks.performHnBrowserLogin,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.cookieStore.save.mockResolvedValue(undefined);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
});

describe('HnLoginCommand', () => {
	it('saves --cookies and emits JSON envelope', async () => {
		const view = render(
			<HnLoginCommand
				mode="hn-login"
				flags={{...baseFlags, cookies: 'user=alice&tok'}}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'user=alice&tok',
		);
		expect(mocks.cookieStore.save).toHaveBeenCalled();
		expect(view.lastFrame()).toContain('"ok": true');
		expect(view.lastFrame()).toContain('"source": "cookies-flag"');
	});

	it('whoami fetches profile and renders details', async () => {
		mocks.api.getMyProfile.mockResolvedValue({
			id: 'alice',
			karma: 99,
			created: 1,
			submitted: [1, 2, 3],
		});
		const view = render(
			<HnLoginCommand mode="hn-whoami" flags={baseFlags} format="human" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('alice');
		expect(view.lastFrame()).toContain('99');
	});

	it('whoami without auth surfaces the login hint', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<HnLoginCommand mode="hn-whoami" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('"code": 77');
	});

	it('logout clears the store', async () => {
		const view = render(
			<HnLoginCommand mode="hn-logout" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(mocks.cookieStore.clear).toHaveBeenCalled();
		expect(mocks.cookieStore.save).toHaveBeenCalled();
		expect(view.lastFrame()).toContain('"cleared": true');
	});

	it('login surfaces a timeout from the browser flow', async () => {
		mocks.performHnBrowserLogin.mockImplementation(
			async (callbacks: {onStatusChange?: (s: string, m?: string) => void}) => {
				callbacks.onStatusChange?.('timeout', '登录超时');
				throw new Error('Hacker News 登录超时，请重新运行 "zget hn login"');
			},
		);
		const view = render(
			<HnLoginCommand mode="hn-login" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('登录超时');
	});

	it('login surfaces an error from the browser flow', async () => {
		mocks.performHnBrowserLogin.mockImplementation(
			async (callbacks: {onStatusChange?: (s: string, m?: string) => void}) => {
				callbacks.onStatusChange?.('error', '浏览器崩溃');
				throw new Error('浏览器崩溃');
			},
		);
		const view = render(
			<HnLoginCommand mode="hn-login" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
	});

	it('whoami human mode renders details rows', async () => {
		mocks.api.getMyProfile.mockResolvedValue({
			id: 'bob',
			karma: 9,
			created: 1_700_000_000,
			submitted: [1],
			about: 'hi',
		});
		const view = render(
			<HnLoginCommand mode="hn-whoami" flags={baseFlags} format="human" />,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('bob');
		expect(frame).toContain('Karma');
	});

	it('login (browser flow) renders the waiting scan status in human mode', async () => {
		let triggerReady: ((url: string) => void) | undefined;
		let triggerStatus: ((s: string, m?: string) => void) | undefined;
		mocks.performHnBrowserLogin.mockImplementation(
			async (callbacks: {
				onReady?: (u: string) => void;
				onStatusChange?: (s: string, m?: string) => void;
			}) => {
				triggerReady = callbacks.onReady;
				triggerStatus = callbacks.onStatusChange;
				triggerReady?.('https://news.ycombinator.com/login?goto=news');
				triggerStatus?.('waiting');
				triggerStatus?.('captured');
			},
		);
		const view = render(
			<HnLoginCommand mode="hn-login" flags={baseFlags} format="human" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('登录成功');
	});

	it('login (no cookies) invokes the browser flow', async () => {
		mocks.performHnBrowserLogin.mockImplementation(
			async (callbacks: {
				onReady?: (u: string) => void;
				onStatusChange?: (s: string, m?: string) => void;
			}) => {
				callbacks.onReady?.('https://news.ycombinator.com/login?goto=news');
				callbacks.onStatusChange?.('captured');
			},
		);

		const view = render(
			<HnLoginCommand mode="hn-login" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(mocks.performHnBrowserLogin).toHaveBeenCalled();
		expect(view.lastFrame()).toContain('"source": "browser"');
	});
});
