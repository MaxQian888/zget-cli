import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import ErrorDisplay from '../../source/components/error-display';

describe('ErrorDisplay', () => {
	it('renders the error header and message', () => {
		const {lastFrame} = render(<ErrorDisplay message="请求失败" />);

		expect(lastFrame()).toContain('✗ 错误');
		expect(lastFrame()).toContain('请求失败');
		expect(lastFrame()).not.toContain('提示:');
	});

	it('renders the optional suggestion when provided', () => {
		const {lastFrame} = render(
			<ErrorDisplay message="请求失败" suggestion="请稍后重试" />,
		);

		expect(lastFrame()).toContain('提示: 请稍后重试');
	});
});
