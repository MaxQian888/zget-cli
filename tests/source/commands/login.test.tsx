import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import LoginCommand from '../../../source/commands/login';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	qrToString: vi.fn(),
	performQrLogin: vi.fn(),
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

setupCommandTestHarness();

beforeEach(() => {
	mocks.qrToString.mockResolvedValue('QR-CODE');
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
});
