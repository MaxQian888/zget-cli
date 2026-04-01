import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import DownloadProgress from '../../source/components/download-progress';

describe('DownloadProgress', () => {
	it('renders active progress with a spinner and counters', () => {
		const {lastFrame} = render(
			<DownloadProgress
				progress={{
					phase: 'images',
					message: '正在下载图片',
					current: 2,
					total: 5,
				}}
			/>,
		);
		const frame = lastFrame();

		expect(frame).toContain('[spinner]');
		expect(frame).toContain('🖼 正在下载图片');
		expect(frame).toContain('(2/5)');
	});

	it('renders terminal states without a spinner', () => {
		const {lastFrame, rerender} = render(
			<DownloadProgress
				progress={{
					phase: 'done',
					message: '下载完成',
				}}
			/>,
		);

		expect(lastFrame()).toContain('✓ 下载完成');
		expect(lastFrame()).not.toContain('[spinner]');

		rerender(
			<DownloadProgress
				progress={{
					phase: 'error',
					message: '下载失败',
				}}
			/>,
		);

		expect(lastFrame()).toContain('✗ 下载失败');
		expect(lastFrame()).not.toContain('[spinner]');
	});

	it('falls back to the default icon and hides incomplete counters', () => {
		const {lastFrame} = render(
			<DownloadProgress
				progress={
					{
						phase: 'queued',
						message: '等待中',
						current: 1,
					} as Parameters<typeof DownloadProgress>[0]['progress']
				}
			/>,
		);
		const frame = lastFrame();

		expect(frame).toContain('[spinner]');
		expect(frame).toContain('· 等待中');
		expect(frame).not.toContain('(1/');
	});
});
