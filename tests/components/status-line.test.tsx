import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import StatusLine from '../../source/components/status-line';

describe('StatusLine', () => {
	it('shows a spinner by default', () => {
		const {lastFrame} = render(<StatusLine message="正在加载" />);
		const frame = lastFrame();

		expect(frame).toContain('[spinner]');
		expect(frame).toContain('正在加载');
	});

	it('supports non-loading status messages', () => {
		const {lastFrame, rerender} = render(
			<StatusLine message="正在加载" isLoading={false} />,
		);

		expect(lastFrame()).toContain('正在加载');
		expect(lastFrame()).not.toContain('[spinner]');

		rerender(<StatusLine message="加载完成" />);

		expect(lastFrame()).toContain('[spinner]');
		expect(lastFrame()).toContain('加载完成');
	});
});
