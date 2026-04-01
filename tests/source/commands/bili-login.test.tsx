import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import BiliLoginCommand from '../../../source/commands/bili-login';
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
		getMyInfo: vi.fn(),
	},
	performBiliQrLogin: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/bili-auth', () => ({
	BiliCookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
	performBiliQrLogin: mocks.performBiliQrLogin,
}));

vi.mock('../../../source/core/api/bili-api', () => ({
	BiliApi: class MockBiliApi {
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
	mocks.api.getMyInfo.mockResolvedValue({
		name: 'OpenAI',
		mid: 114_514,
		sign: 'AI lab',
	});
});

describe('BiliLoginCommand', () => {
	it('saves manual cookies immediately when provided', async () => {
		const view = render(
			<BiliLoginCommand
				mode="bili-login"
				flags={{...baseFlags, cookies: 'SESSDATA=value'}}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ Cookie 已保存');
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'SESSDATA=value',
		);
		expect(mocks.cookieStore.save).toHaveBeenCalled();
	});

	it('shows the qr link while waiting for a scan', async () => {
		mocks.performBiliQrLogin.mockImplementation(async callbacks => {
			callbacks.onQrReady('https://bili.qr/login');
			callbacks.onStatusChange('waiting');
			return new Promise(() => {});
		});

		const view = render(
			<BiliLoginCommand mode="bili-login" flags={baseFlags} />,
		);

		expect(view.lastFrame()).toContain('正在处理...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('https://bili.qr/login');
		expect(frame).toContain('等待扫码...');
	});

	it('shows the scanned status while waiting for confirmation', async () => {
		mocks.performBiliQrLogin.mockImplementation(async callbacks => {
			callbacks.onQrReady('https://bili.qr/scanned');
			callbacks.onStatusChange('scanned');
			return new Promise(() => {});
		});

		const view = render(
			<BiliLoginCommand mode="bili-login" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('https://bili.qr/scanned');
		expect(frame).toContain('已扫码，请在手机上确认...');
	});

	it('shows login success when qr confirmation completes', async () => {
		mocks.performBiliQrLogin.mockImplementation(async callbacks => {
			callbacks.onQrReady('https://bili.qr/confirmed');
			callbacks.onStatusChange('confirmed');
		});

		const view = render(
			<BiliLoginCommand mode="bili-login" flags={baseFlags} />,
		);

		await flushAsync();

		expect(view.lastFrame()).toContain('✓ 登录成功！Cookie 已保存');
	});

	it('shows an error when the qr code expires', async () => {
		mocks.performBiliQrLogin.mockImplementation(async callbacks => {
			callbacks.onStatusChange('expired', '二维码过期');
		});

		const view = render(
			<BiliLoginCommand mode="bili-login" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('二维码过期');
		expect(frame).toContain('使用 --cookies 手动传入');
	});

	it('shows a generic qr error when the callback reports one', async () => {
		mocks.performBiliQrLogin.mockImplementation(async callbacks => {
			callbacks.onStatusChange('error', '登录异常');
		});

		const view = render(
			<BiliLoginCommand mode="bili-login" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('登录异常');
		expect(frame).toContain('请重新运行 "zget bili login"');
	});

	it('shows the fallback scan status for unknown qr states', async () => {
		mocks.performBiliQrLogin.mockImplementation(async callbacks => {
			callbacks.onQrReady('https://bili.qr/unknown');
			callbacks.onStatusChange('mystery' as never, '未知状态');
			return new Promise(() => {});
		});

		const view = render(
			<BiliLoginCommand mode="bili-login" flags={baseFlags} />,
		);

		await flushAsync();

		expect(view.lastFrame()).toContain('未知状态');
	});

	it('renders raw json output for whoami mode', async () => {
		const view = render(
			<BiliLoginCommand mode="bili-whoami" flags={baseFlags} format="json" />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"name": "OpenAI"');
		expect(frame).toContain('"mid": 114514');
	});

	it('renders human details for whoami mode', async () => {
		const view = render(
			<BiliLoginCommand mode="bili-whoami" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 当前登录用户');
		expect(frame).toContain('昵称:');
		expect(frame).toContain('OpenAI');
		expect(frame).toContain('UID:');
		expect(frame).toContain('114514');
	});

	it('clears cookies on logout', async () => {
		const view = render(
			<BiliLoginCommand mode="bili-logout" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 已退出登录，Cookie 已清除');
		expect(mocks.cookieStore.clear).toHaveBeenCalled();
		expect(mocks.cookieStore.save).toHaveBeenCalled();
	});

	it('shows an auth error when whoami runs without a session', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);

		const view = render(
			<BiliLoginCommand mode="bili-whoami" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('未登录，请先运行 "zget bili login"');
		expect(frame).toContain('使用 --cookies 手动传入');
	});

	it('surfaces unsupported bili login modes as errors', async () => {
		const view = render(
			<BiliLoginCommand mode={'bili-unknown' as never} flags={baseFlags} />,
		);

		await flushAsync();

		expect(view.lastFrame()).toContain('Unsupported Bilibili login mode');
	});
});
