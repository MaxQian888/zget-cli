import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import WeiboLoginCommand from '../../../source/commands/weibo-login';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		save: vi.fn(),
		isAuthenticated: vi.fn(),
		clear: vi.fn(),
	},
	api: {
		getMyProfile: vi.fn(),
	},
	performWeiboQrLogin: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/weibo-auth', () => ({
	WeiboCookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
	performWeiboQrLogin: mocks.performWeiboQrLogin,
}));

vi.mock('../../../source/core/api/weibo-api', () => ({
	WeiboApi: class MockWeiboApi {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.cookieStore.save.mockResolvedValue(undefined);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.api.getMyProfile.mockResolvedValue({
		id: 1234,
		idstr: '1234',
		screen_name: 'TestUser',
		description: 'sig',
		followers_count: 10,
		friends_count: 5,
		statuses_count: 100,
	});
});

describe('WeiboLoginCommand', () => {
	it('saves manual cookies immediately when --cookies provided', async () => {
		const view = render(
			<WeiboLoginCommand
				mode="weibo-login"
				flags={{...baseFlags, cookies: 'SUB=v;SUBP=v'}}
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('✓ Cookie 已保存');
		expect(mocks.cookieStore.save).toHaveBeenCalled();
	});

	it('shows QR url and waiting state during scan flow', async () => {
		mocks.performWeiboQrLogin.mockImplementation(async callbacks => {
			callbacks.onQrReady('https://login.sina.com.cn/qr.png', 'QR-1');
			callbacks.onStatusChange('waiting');
			return new Promise(() => {});
		});
		const view = render(
			<WeiboLoginCommand mode="weibo-login" flags={baseFlags} />,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('https://login.sina.com.cn/qr.png');
		expect(frame).toContain('等待扫码...');
	});

	it('shows scanned then confirmed transitions', async () => {
		mocks.performWeiboQrLogin.mockImplementation(async callbacks => {
			callbacks.onQrReady('https://x/q.png', 'Q');
			callbacks.onStatusChange('scanned');
			callbacks.onStatusChange('confirmed');
		});
		const view = render(
			<WeiboLoginCommand mode="weibo-login" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('✓ 登录成功！Cookie 已保存');
	});

	it('shows error when QR expires', async () => {
		mocks.performWeiboQrLogin.mockImplementation(async callbacks => {
			callbacks.onStatusChange('expired', '二维码过期');
		});
		const view = render(
			<WeiboLoginCommand mode="weibo-login" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('二维码过期');
	});

	it('shows error from generic error callback', async () => {
		mocks.performWeiboQrLogin.mockImplementation(async callbacks => {
			callbacks.onStatusChange('error', '登录异常');
		});
		const view = render(
			<WeiboLoginCommand mode="weibo-login" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('登录异常');
	});

	it('falls back to scan-status text on unknown qr state', async () => {
		mocks.performWeiboQrLogin.mockImplementation(async callbacks => {
			callbacks.onQrReady('https://x/q.png', 'Q');
			callbacks.onStatusChange('mystery' as never, '未知');
			return new Promise(() => {});
		});
		const view = render(
			<WeiboLoginCommand mode="weibo-login" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('未知');
	});

	it('renders json envelope for whoami in --format json', async () => {
		const view = render(
			<WeiboLoginCommand mode="weibo-whoami" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"ok": true');
		expect(frame).toContain('"screen_name": "TestUser"');
	});

	it('renders human details for whoami', async () => {
		const view = render(
			<WeiboLoginCommand mode="weibo-whoami" flags={baseFlags} />,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 当前登录用户');
		expect(frame).toContain('TestUser');
	});

	it('errors when whoami runs without auth', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<WeiboLoginCommand mode="weibo-whoami" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('未登录');
	});

	it('clears cookies on logout', async () => {
		const view = render(
			<WeiboLoginCommand mode="weibo-logout" flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('✓ 已退出登录');
		expect(mocks.cookieStore.clear).toHaveBeenCalled();
	});

	it('emits json envelope on logout', async () => {
		const view = render(
			<WeiboLoginCommand mode="weibo-logout" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"cleared": true');
	});

	it('surfaces unsupported mode as an error', async () => {
		const view = render(
			<WeiboLoginCommand mode={'weibo-unknown' as never} flags={baseFlags} />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('Unsupported Weibo login mode');
	});
});
