import {describe, expect, it} from 'vitest';
import {
	extractCsdnCategoryInfo,
	extractCsdnContent,
	extractCsdnMetadata,
	isCsdnCategory,
} from '../../../../source/core/parser/platforms/csdn-parser';

describe('csdn parser', () => {
	it('extracts metadata and article content', () => {
		const html = `
			<h1 class="title-article">CSDN Article</h1>
			<div class="bar-content">
				<a>Astro Air</a>
				<span>2026-04-01</span>
			</div>
			<div id="content_views"><p>Body</p></div>
		`;

		expect(
			extractCsdnMetadata(html, 'https://blog.csdn.net/demo/article/details/1'),
		).toEqual({
			title: 'CSDN Article',
			author: 'Astro Air',
			date: '20260401',
			url: 'https://blog.csdn.net/demo/article/details/1',
		});
		expect(extractCsdnContent(html)).toContain('<p>Body</p>');
	});

	it('extracts category titles and normalizes article urls', () => {
		const html = `
			<h3 class="column_title">Category title</h3>
			<title>Fallback title - CSDN博客</title>
			<ul class="column_article_list">
				<li><a href="/demo/article/details/1">One</a></li>
				<li><a href="https://blog.csdn.net/demo/article/details/2">Two</a></li>
			</ul>
		`;

		expect(extractCsdnCategoryInfo(html)).toEqual({
			title: 'Category title',
			articleUrls: [
				'https://blog.csdn.net/demo/article/details/1',
				'https://blog.csdn.net/demo/article/details/2',
			],
		});
		expect(isCsdnCategory('https://blog.csdn.net/demo/category_1.html')).toBe(
			true,
		);
		expect(isCsdnCategory('https://blog.csdn.net/demo/article/details/1')).toBe(
			false,
		);
	});

	it('falls back to page titles when explicit headers are missing', () => {
		expect(
			extractCsdnMetadata(
				`
					<title>Fallback title - CSDN博客</title>
					<h1>Fallback article</h1>
					<div class="bar-content"></div>
				`,
				'https://blog.csdn.net/demo/article/details/2',
			),
		).toEqual({
			title: 'Fallback article',
			author: 'Unknown',
			date: '',
			url: 'https://blog.csdn.net/demo/article/details/2',
		});
	});
});
