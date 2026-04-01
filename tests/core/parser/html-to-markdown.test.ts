import {describe, expect, it} from 'vitest';
import {
	buildMarkdownDocument,
	convertHtmlToMarkdown,
} from '../../../source/core/parser/html-to-markdown';

describe('convertHtmlToMarkdown', () => {
	it('applies shared link, math, and image rules while collecting mappings', () => {
		const result = convertHtmlToMarkdown(
			`
				<style>.hidden { display: none; }</style>
				<p><span class="ztext-math" data-tex="x + y">formula</span></p>
				<p>
					<a href="//link.zhihu.com/?target=https%3A%2F%2Fopenai.com">OpenAI</a>
				</p>
				<img src="https://cdn.example.com/hero.png" alt="hero" />
			`,
			'images',
		);

		expect(result.markdown).toContain('$x + y$');
		expect(result.markdown).toContain('[OpenAI](https://openai.com)');
		expect(result.markdown).toContain('![hero](images/hero.png)');
		expect(result.images).toEqual([
			{
				originalUrl: 'https://cdn.example.com/hero.png',
				localPath: 'images/hero.png',
			},
		]);
	});
});

describe('buildMarkdownDocument', () => {
	it('builds a standard markdown document wrapper', () => {
		expect(
			buildMarkdownDocument(
				'Title',
				'Astro Air',
				'https://example.com/post',
				'Body content',
			),
		).toBe(
			'# Title\n\n**Author:** Astro Air\n\n**Link:** https://example.com/post\n\nBody content',
		);
	});

	it('returns a placeholder when content is empty', () => {
		expect(
			buildMarkdownDocument('Title', 'Author', 'https://example.com', '  '),
		).toBe('# Title\n\nContent is empty.');
	});
});
