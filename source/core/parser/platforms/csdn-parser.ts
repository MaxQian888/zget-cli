import {load} from 'cheerio';
import type {ArticleMetadata} from '../metadata-extractor';

function selectNonEmpty(
	...values: Array<string | undefined>
): string | undefined {
	for (const value of values) {
		if (value !== undefined && value !== '') {
			return value;
		}
	}

	return undefined;
}

export function extractCsdnMetadata(
	html: string,
	sourceUrl: string,
): ArticleMetadata {
	const $ = load(html);

	const title =
		$('h1.title-article').text().trim() ||
		$('h1').first().text().trim() ||
		'Untitled';

	const barContent = $('div.bar-content');
	const author = barContent.find('a').first().text().trim() || 'Unknown';

	const dateText = barContent.text();
	const dateMatch = /\d{4}-\d{2}-\d{2}/.exec(dateText);
	const date = dateMatch ? dateMatch[0].replaceAll('-', '') : '';

	return {title, author, date, url: sourceUrl};
}

export function extractCsdnContent(html: string): string {
	const $ = load(html);
	const content = $('div#content_views');
	return content.html() ?? '';
}

export function extractCsdnCategoryInfo(html: string): {
	title: string;
	articleUrls: string[];
} {
	const $ = load(html);
	const columnTitle = $('h3.column_title').text().trim();
	const pageTitle = $('title').text().split('-')[0]?.trim() ?? '';
	const title = selectNonEmpty(columnTitle, pageTitle) ?? 'Category';

	const articleUrls: string[] = [];
	$('ul.column_article_list li a').each((_i, element) => {
		const href = $(element).attr('href');
		if (href?.includes('/article/details/')) {
			const fullUrl = href.startsWith('http')
				? href
				: `https://blog.csdn.net${href}`;
			articleUrls.push(fullUrl);
		}
	});

	return {title, articleUrls};
}

export function isCsdnCategory(url: string): boolean {
	return url.includes('category');
}
