import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import InteractResult from '../../source/components/interact-result';

describe('InteractResult', () => {
	it('renders success results', () => {
		const {lastFrame} = render(<InteractResult isSuccess message="发布成功" />);

		expect(lastFrame()).toContain('✓ 发布成功');
	});

	it('renders failure results', () => {
		const {lastFrame} = render(
			<InteractResult isSuccess={false} message="发布失败" />,
		);

		expect(lastFrame()).toContain('✗ 发布失败');
	});
});
