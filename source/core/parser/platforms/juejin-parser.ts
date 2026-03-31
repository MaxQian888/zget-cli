import {load} from 'cheerio';
import type {ArticleMetadata} from '../metadata-extractor';

export function extractJuejinMetadata(
	html: string,
	sourceUrl: string,
): ArticleMetadata {
	const $ = load(html);

	const title =
		$('h1.article-title').text().trim() ||
		$('h1').first().text().trim() ||
		'Untitled';

	const author =
		$('span.name').first().text().trim() ||
		$('a.username').first().text().trim() ||
		'未知作者';

	const dateText = $('time.time').first().text().trim();
	const dateMatch = /\d{4}-\d{2}-\d{2}/.exec(dateText);
	const date = dateMatch ? dateMatch[0].replaceAll('-', '') : '';

	return {title, author, date, url: sourceUrl};
}

export function extractJuejinContent(html: string): string {
	const $ = load(html);
	const content = $('div.markdown-body');
	if (content.length > 0) return content.html() ?? '';

	// Fallback
	const main = $('div.main');
	return main.html() ?? '';
}
