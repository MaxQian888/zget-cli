import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import LoginCommand from '../../../source/commands/login';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	qrToString: vi.fn(),
	performQrLogin: vi.fn(),
	cookieStore: {
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
		save: vi.fn(),
	},
	api: {
		validateSession: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('qrcode', () => ({
	default: {
		toString: mocks.qrToString,
	},
}));

vi.mock('../../../source/core/auth/qr-login', () => ({
	performQrLogin: mocks.performQrLogin,
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

setupCommandTestHarness();

beforeEach(() => {
	mocks.qrToString.mockResolvedValue('QR-CODE');
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.cookieStore.save.mockResolvedValue(undefined);
	mocks.api.validateSession.mockResolvedValue({valid: true});
});

describe('LoginCommand', () => {
	it('renders the qr code and waiting hint when login is in progress', async () => {
		mocks.performQrLogin.mockImplementation(async callbacks => {
			await callbacks.onQrReady('https://qr.example');
			callbacks.onStatusChange('waiting');
		});

		const view = render(<LoginCommand flags={baseFlags} />);

		expect(view.lastFrame()).toContain('zget - 知乎登录');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('QR-CODE');
		expect(frame).toContain('等待扫描...');
		expect(frame).toContain('https://qr.example');
	});

	it('shows the login failure when qr login throws', async () => {
		mocks.performQrLogin.mockRejectedValue(new Error('二维码登录失败'));

		const view = render(<LoginCommand flags={baseFlags} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('二维码登录失败');
		expect(frame).toContain('登录失败');
	});

	it('falls back to qr display when qrcode rendering fails', async () => {
		mocks.qrToString.mockRejectedValue(new Error('terminal too narrow'));
		mocks.performQrLogin.mockImplementation(async callbacks => {
			await callbacks.onQrReady('https://qr.example');
			callbacks.onStatusChange('waiting');
		});

		const view = render(<LoginCommand flags={baseFlags} />);
		await flushAsync();

		const frame = view.lastFrame() ?? '';
		// QR-CODE string is never produced, but link fallback is shown.
		expect(frame).not.toContain('QR-CODE');
		expect(frame).toContain('https://qr.example');
	});

	it('uses --cookie when provided and finishes with status=confirmed', async () => {
		const view = render(
			<LoginCommand flags={baseFlags} cookie="z_c0=abc; _xsrf=1; d_c0=2" />,
		);
		await flushAsync();
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'z_c0=abc; _xsrf=1; d_c0=2',
		);
		expect(mocks.cookieStore.save).toHaveBeenCalled();
		expect(mocks.performQrLogin).not.toHaveBeenCalled();
		expect(view.lastFrame()).toContain('登录成功');
	});

	it('falls back to flags.cookies when --cookie is absent', async () => {
		render(<LoginCommand flags={{...baseFlags, cookies: 'z_c0=abc'}} />);
		await flushAsync();
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'z_c0=abc',
		);
	});

	it('errors when the cookie string is missing required fields', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(<LoginCommand flags={baseFlags} cookie="garbage=1" />);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Cookie 缺少必需字段');
	});

	it('errors when validateSession reports invalid', async () => {
		mocks.api.validateSession.mockResolvedValue({valid: false});
		const view = render(<LoginCommand flags={baseFlags} cookie="z_c0=abc" />);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('cookie 已失效');
	});
});
