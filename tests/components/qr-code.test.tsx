import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import QrCodeStatus from '../../source/components/qr-code';

describe('QrCodeStatus', () => {
	it('renders the loading state', () => {
		const {lastFrame} = render(<QrCodeStatus status="loading" />);
		const frame = lastFrame();

		expect(frame).toContain('[spinner]');
		expect(frame).toContain('正在获取二维码...');
	});

	it('renders the waiting state with an optional message', () => {
		const {lastFrame} = render(
			<QrCodeStatus status="waiting" message="二维码已生成" />,
		);
		const frame = lastFrame();

		expect(frame).toContain('二维码已生成');
		expect(frame).toContain('[spinner]');
		expect(frame).toContain('等待扫描...');
		expect(frame).toContain('请使用知乎 App 扫描上方二维码');
	});

	it('renders the scanned state', () => {
		const {lastFrame} = render(<QrCodeStatus status="scanned" />);
		const frame = lastFrame();

		expect(frame).toContain('[spinner]');
		expect(frame).toContain('已扫描，请在手机上确认登录...');
	});

	it('renders the confirmed and expired states', () => {
		const {lastFrame, rerender} = render(<QrCodeStatus status="confirmed" />);

		expect(lastFrame()).toContain('✓ 登录成功！');
		expect(lastFrame()).not.toContain('[spinner]');

		rerender(<QrCodeStatus status="expired" />);

		expect(lastFrame()).toContain('✗ 二维码已过期，请重新运行 zget login');
		expect(lastFrame()).not.toContain('[spinner]');
	});

	it('renders the error state with and without details', () => {
		const {lastFrame, rerender} = render(
			<QrCodeStatus status="error" message="网络超时" />,
		);

		expect(lastFrame()).toContain('✗ 登录失败: 网络超时');

		rerender(<QrCodeStatus status="error" />);

		expect(lastFrame()).toContain('✗ 登录失败');
		expect(lastFrame()).not.toContain('网络超时');
	});

	it('returns an empty frame for unknown states', () => {
		const {lastFrame} = render(
			<QrCodeStatus
				status={'unknown' as Parameters<typeof QrCodeStatus>[0]['status']}
			/>,
		);

		expect(lastFrame()).toBe('');
	});
});
