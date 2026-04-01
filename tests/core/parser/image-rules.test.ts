import TurndownService from 'turndown';
import {beforeEach, describe, expect, it} from 'vitest';
import {
	addImageRules,
	getCollectedImages,
	resetImageCollector,
} from '../../../source/core/parser/image-rules';

describe('addImageRules', () => {
	beforeEach(() => {
		resetImageCollector();
	});

	it('collects image mappings from platform-specific attributes', () => {
		const turndown = new TurndownService();
		addImageRules(turndown, 'assets');

		const markdown = turndown.turndown(`
			<figure>
				<img data-src="https://mmbiz.qpic.cn/path/cover?wx_fmt=png" alt="wx" />
				<figcaption>WeChat cover</figcaption>
			</figure>
			<img data-original="//cdn.example.com/images/pic.jpg?size=large" alt="hero" />
		`);

		expect(markdown).toContain('![wx](assets/img_00.png)');
		expect(markdown).toContain('*WeChat cover*');
		expect(markdown).toContain('![hero](assets/pic.jpg)');
		expect(getCollectedImages()).toEqual([
			{
				originalUrl: 'https://mmbiz.qpic.cn/path/cover?wx_fmt=png',
				localPath: 'assets/img_00.png',
			},
			{
				originalUrl: '//cdn.example.com/images/pic.jpg?size=large',
				localPath: 'assets/pic.jpg',
			},
		]);
	});

	it('skips svg placeholders and falls back to sequential filenames for invalid urls', () => {
		const turndown = new TurndownService();
		addImageRules(turndown, 'images');

		const markdown = turndown.turndown(`
			<img src="data:image/svg+xml;base64,abc" />
			<img class="lazy loaded" src="placeholder" />
			<img src="not a url" alt="broken" />
		`);

		expect(markdown).not.toContain('data:image');
		expect(markdown).toContain('![broken](images/img_00.jpg)');
		expect(getCollectedImages()).toEqual([
			{
				originalUrl: 'not a url',
				localPath: 'images/img_00.jpg',
			},
		]);
	});
});
