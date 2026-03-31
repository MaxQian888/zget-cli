import {load} from 'cheerio';
import type {ArticleMetadata} from '../metadata-extractor';

export function extractWeixinMetadata(
	html: string,
	sourceUrl: string,
): ArticleMetadata {
	const $ = load(html);

	const title =
		$('h1#activity-name').text().trim() ||
		$('h1').first().text().trim() ||
		'Untitled';

	const author =
		$('div#meta_content a').first().text().trim() ||
		$('a#js_name').text().trim() ||
		'未知作者';

	// Date in WeChat is embedded in <script> tags
	let date = '';
	$('script[type="text/javascript"]').each((_i, element) => {
		const scriptContent = $(element).html() ?? '';
		const match = /\d{4}-\d{2}-\d{2}/.exec(scriptContent);
		if (match && !date) {
			date = match[0].replaceAll('-', '');
		}
	});

	return {title, author, date, url: sourceUrl};
}

export function extractWeixinContent(html: string): string {
	const $ = load(html);
	const content = $('div#js_content');
	return content.html() ?? '';
}

/**
 * WeChat images use data-src and have wx_fmt parameter for format.
 * This function preprocesses the HTML to normalize image sources.
 */
export function preprocessWeixinImages(html: string): string {
	const $ = load(html);

	$('img').each((_i, element) => {
		const img = $(element);
		const dataSrc = img.attr('data-src');
		if (dataSrc && !img.attr('src')?.startsWith('http')) {
			img.attr('src', dataSrc);
		}
	});

	return $.html();
}
