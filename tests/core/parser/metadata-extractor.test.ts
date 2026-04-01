import {describe, expect, it} from 'vitest';
import {
	extractAnswerContent,
	extractAnswerMetadata,
	extractArticleContent,
	extractArticleMetadata,
	extractColumnInfo,
	extractVideoMetadata,
} from '../../../source/core/parser/metadata-extractor';

describe('metadata extractor', () => {
	it('extracts article and answer metadata with sensible fallbacks', () => {
		const articleHtml = `
			<h1 class="Post-Title">Article Title</h1>
			<div class="AuthorInfo"><meta itemprop="name" content="Author" /></div>
			<div class="ContentItem-time">发布于 2026-04-01</div>
			<div class="Post-RichTextContainer"><p>Article body</p></div>
		`;
		expect(
			extractArticleMetadata(articleHtml, 'https://example.com/article'),
		).toEqual({
			title: 'Article Title',
			author: 'Author',
			date: '20260401',
			url: 'https://example.com/article',
		});
		expect(extractArticleContent(articleHtml)).toContain('<p>Article body</p>');

		const answerHtml = `
			<meta property="og:title" content="Answer Title" />
			<meta property="og:author" content="Fallback Author" />
			<time>2026-03-30</time>
			<div class="RichContent-inner"><p>Answer body</p></div>
		`;
		expect(
			extractAnswerMetadata(answerHtml, 'https://example.com/answer'),
		).toEqual({
			title: 'Answer Title',
			author: 'Fallback Author',
			date: '20260330',
			url: 'https://example.com/answer',
		});
		expect(extractAnswerContent(answerHtml)).toContain('<p>Answer body</p>');
	});

	it('extracts video metadata and a playable url from embedded state', () => {
		const html = `
			<div class="ZVideo-video" data-zop='{"title":"Video title","authorName":"Video author"}'></div>
			<div class="ZVideo-meta">发布于 2026-04-02</div>
			<script id="js-initialData" type="application/json">
				{"initialState":{"entities":{"zvideos":{"1":{"video":{"playlist":{"hd":{"playUrl":"https://video.example.com/play.m3u8"}}}}}}}}
			</script>
		`;

		expect(extractVideoMetadata(html, 'https://example.com/video')).toEqual({
			metadata: {
				title: 'Video title',
				author: 'Video author',
				date: '20260402',
				url: 'https://example.com/video',
			},
			videoUrl: 'https://video.example.com/play.m3u8',
		});
	});

	it('extracts column metadata and handles unknown article counts', () => {
		expect(
			extractColumnInfo(
				'<title>Knowledge Weekly - 知乎专栏 · 42 篇内容</title>',
			),
		).toEqual({
			title: 'Knowledge Weekly',
			totalArticles: 42,
		});
		expect(extractColumnInfo('<title>Untitled Column</title>')).toEqual({
			title: 'Untitled Column',
			totalArticles: -1,
		});
	});

	it('falls back when video metadata payloads are missing or invalid', () => {
		expect(
			extractVideoMetadata(
				`
					<div class="ZVideo-video" data-zop="not json"></div>
					<div class="ZVideo-meta">发布时间未知</div>
				`,
				'https://example.com/video-fallback',
			),
		).toEqual({
			metadata: {
				title: 'Untitled',
				author: 'Unknown',
				date: '',
				url: 'https://example.com/video-fallback',
			},
			videoUrl: undefined,
		});
	});
});
