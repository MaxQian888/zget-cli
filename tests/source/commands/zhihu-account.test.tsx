import type fsPromises from 'node:fs/promises';
import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ZhihuAccountCommand from '../../../source/commands/zhihu-account';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		isAuthenticated: vi.fn(),
		parseCookieString: vi.fn(),
		save: vi.fn(),
	},
	api: {
		getMe: vi.fn(),
		validateSession: vi.fn(),
	},
	rm: vi.fn(),
	performQrLogin: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/cookie-store', () => ({
	CookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/client', () => ({
	ApiClient: class MockApiClient {},
}));

vi.mock('../../../source/core/api/zhihu-api', () => ({
	ZhihuApi: class MockZhihuApi {
		constructor() {
			return mocks.api;
		}
	},
}));

vi.mock('node:fs/promises', async () => {
	const actual = await vi.importActual<typeof fsPromises>('node:fs/promises');
	return {
		...actual,
		rm: (...args: unknown[]) => mocks.rm(...args),
	};
});

vi.mock('../../../source/core/auth/qr-login', () => ({
	performQrLogin: (...args: unknown[]) => mocks.performQrLogin(...args),
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(true);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.cookieStore.save.mockResolvedValue(undefined);
	mocks.api.getMe.mockResolvedValue({
		id: 'u1',
		name: 'Alice',
		urlToken: 'alice',
		headline: 'hi',
		avatarUrl: 'http://a.png',
	});
	mocks.api.validateSession.mockResolvedValue({valid: true, name: 'Alice'});
	mocks.rm.mockResolvedValue(undefined);
	mocks.performQrLogin.mockResolvedValue(undefined);
});

describe('ZhihuAccountCommand', () => {
	it('whoami fetches /me and renders the profile', async () => {
		const view = render(
			<ZhihuAccountCommand kind="zhihu-whoami" flags={baseFlags} />,
		);
		await flushAsync();
		expect(mocks.api.getMe).toHaveBeenCalled();
		expect(view.lastFrame()).toContain('Alice');
	});

	it('whoami emits envelope JSON when format=json', async () => {
		const view = render(
			<ZhihuAccountCommand
				kind="zhihu-whoami"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			data: {name: string};
		};
		expect(parsed.ok).toBe(true);
		expect(parsed.data.name).toBe('Alice');
	});

	it('logout removes the cookie file', async () => {
		render(<ZhihuAccountCommand kind="zhihu-logout" flags={baseFlags} />);
		await flushAsync();
		expect(mocks.rm).toHaveBeenCalled();
	});

	it('status reports authenticated when cookies present', async () => {
		const view = render(
			<ZhihuAccountCommand
				kind="zhihu-status"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			data: {authenticated: boolean};
		};
		expect(parsed.ok).toBe(true);
		expect(parsed.data.authenticated).toBe(true);
	});

	it('login --cookie validates and saves the parsed cookie store', async () => {
		render(
			<ZhihuAccountCommand
				kind="zhihu-login"
				cookie="z_c0=a; _xsrf=b; d_c0=c"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'z_c0=a; _xsrf=b; d_c0=c',
		);
		expect(mocks.api.validateSession).toHaveBeenCalled();
		expect(mocks.cookieStore.save).toHaveBeenCalled();
	});

	it('login --cookie rejects invalid cookies', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<ZhihuAccountCommand
				kind="zhihu-login"
				cookie="missing=stuff"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			error: {code: number};
		};
		expect(parsed.ok).toBe(false);
	});
});
