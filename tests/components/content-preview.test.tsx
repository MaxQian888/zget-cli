import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import ContentPreview from '../../source/components/content-preview';

describe('ContentPreview', () => {
	it('renders a successful download preview and updates when image counts change', () => {
		const result = {
			success: true,
			title: '测试标题',
			author: '测试作者',
			outputPath: 'downloads/article.md',
			imageCount: 2,
		};
		const {lastFrame, rerender} = render(<ContentPreview result={result} />);

		expect(lastFrame()).toContain('✓ 下载完成');
		expect(lastFrame()).toContain('标题: 测试标题');
		expect(lastFrame()).toContain('作者: 测试作者');
		expect(lastFrame()).toContain('图片: 2 张');
		expect(lastFrame()).toContain('保存: downloads/article.md');

		rerender(<ContentPreview result={{...result, imageCount: 0}} />);

		expect(lastFrame()).not.toContain('图片:');
	});

	it('renders failed downloads and includes error details when present', () => {
		const {lastFrame, rerender} = render(
			<ContentPreview
				result={{
					success: false,
					title: '',
					author: '',
					outputPath: '',
					imageCount: 0,
					error: '网络错误',
				}}
			/>,
		);

		expect(lastFrame()).toContain('✗ 下载失败');
		expect(lastFrame()).toContain('网络错误');

		rerender(
			<ContentPreview
				result={{
					success: false,
					title: '',
					author: '',
					outputPath: '',
					imageCount: 0,
				}}
			/>,
		);

		expect(lastFrame()).toContain('✗ 下载失败');
		expect(lastFrame()).not.toContain('网络错误');
	});
});
