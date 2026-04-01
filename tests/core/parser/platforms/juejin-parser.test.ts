import {describe, expect, it} from 'vitest';
import {
	extractJuejinContent,
	extractJuejinMetadata,
} from '../../../../source/core/parser/platforms/juejin-parser';

describe('juejin parser', () => {
	it('extracts metadata and content from standard selectors', () => {
		const html = `
			<h1 class="article-title">Juejin Title</h1>
			<span class="name">Astro</span>
			<time class="time">2026-04-03</time>
			<div class="markdown-body"><p>Juejin body</p></div>
		`;

		expect(extractJuejinMetadata(html, 'https://juejin.cn/post/1')).toEqual({
			title: 'Juejin Title',
			author: 'Astro',
			date: '20260403',
			url: 'https://juejin.cn/post/1',
		});
		expect(extractJuejinContent(html)).toContain('<p>Juejin body</p>');
	});

	it('falls back to the main container when markdown-body is absent', () => {
		expect(
			extractJuejinContent('<div class="main"><p>Fallback body</p></div>'),
		).toContain('<p>Fallback body</p>');
	});

	it('falls back to generic title and author selectors', () => {
		expect(
			extractJuejinMetadata(
				`
					<h1>Fallback title</h1>
					<a class="username">备用作者</a>
				`,
				'https://juejin.cn/post/2',
			),
		).toEqual({
			title: 'Fallback title',
			author: '备用作者',
			date: '',
			url: 'https://juejin.cn/post/2',
		});
	});
});
