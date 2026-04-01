import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import BatchProgress from '../../source/components/batch-progress';

describe('BatchProgress', () => {
	it('renders completed items and the active item while the batch is running', () => {
		const {lastFrame} = render(
			<BatchProgress
				completed={[
					{id: '1', title: '第一项', success: true},
					{id: '2', title: '第二项', success: false},
				]}
				current="第三项"
				successCount={1}
				failedCount={1}
				total={3}
				isFinished={false}
			/>,
		);
		const frame = lastFrame();

		expect(frame).toContain('第一项');
		expect(frame).toContain('第二项');
		expect(frame).toContain('第三项');
		expect(frame).toContain('[spinner]');
		expect(frame).toContain('进度: 2/3');
		expect(frame).toContain('成功 1');
		expect(frame).toContain('失败 1');
	});

	it('omits optional totals and failure count when they are not available', () => {
		const {lastFrame} = render(
			<BatchProgress
				completed={[{id: '1', title: '唯一项', success: true}]}
				successCount={1}
				failedCount={0}
				total={0}
				isFinished={false}
			/>,
		);
		const frame = lastFrame();

		expect(frame).toContain('唯一项');
		expect(frame).toContain('进度: 1');
		expect(frame).toContain('成功 1');
		expect(frame).not.toContain('/0');
		expect(frame).not.toContain('失败 0');
		expect(frame).not.toContain('[spinner]');
	});

	it('shows the completion summary once the batch is finished', () => {
		const {lastFrame} = render(
			<BatchProgress
				isFinished
				completed={[]}
				current="不会显示"
				successCount={2}
				failedCount={0}
				total={2}
			/>,
		);
		const frame = lastFrame();

		expect(frame).toContain('进度: 2/2');
		expect(frame).toContain('✓ 批量下载完成');
		expect(frame).not.toContain('不会显示');
		expect(frame).not.toContain('[spinner]');
	});
});
