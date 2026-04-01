import {load, type CheerioAPI} from 'cheerio';

export type ArticleMetadata = {
	title: string;
	author: string;
	date: string;
	url: string;
};

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

function extractDate($: CheerioAPI, selector: string): string {
	const element = $(selector);
	if (element.length === 0) return '';

	const text = element.text();
	const match = /\d{4}-\d{2}-\d{2}/.exec(text);
	return match ? match[0].replaceAll('-', '') : '';
}

type ZhihuInitialData = {
	initialState?: {
		entities?: {
			zvideos?: Record<
				string,
				{
					video?: {
						playlist?: Record<string, {playUrl?: string}>;
					};
				}
			>;
		};
	};
};

function extractPlayUrlFromPlaylist(
	playlist: Record<string, {playUrl?: string}> | undefined,
): string | undefined {
	if (!playlist) {
		return undefined;
	}

	for (const details of Object.values(playlist)) {
		if (details.playUrl) {
			return details.playUrl;
		}
	}

	return undefined;
}

function extractVideoUrlFromInitialData(
	rawInitialData: string,
): string | undefined {
	try {
		const initialData = JSON.parse(rawInitialData) as ZhihuInitialData;
		const zvideos = initialData.initialState?.entities?.zvideos;
		if (!zvideos) {
			return undefined;
		}

		for (const videoInfo of Object.values(zvideos)) {
			const playUrl = extractPlayUrlFromPlaylist(videoInfo.video?.playlist);
			if (playUrl) {
				return playUrl;
			}
		}
	} catch {
		// Ignore parse errors
	}

	return undefined;
}

export function extractArticleMetadata(
	html: string,
	sourceUrl: string,
): ArticleMetadata {
	const $ = load(html);

	const primaryTitle = $('h1.Post-Title').text().trim();
	const metaTitle = $('meta[property="og:title"]').attr('content')?.trim();
	const title = selectNonEmpty(primaryTitle, metaTitle) ?? 'Untitled';

	const authorMeta = $('div.AuthorInfo')
		.find('meta[itemprop="name"]')
		.attr('content');
	const primaryAuthor = authorMeta?.trim();
	const metaAuthor = $('meta[property="og:author"]').attr('content')?.trim();
	const author = selectNonEmpty(primaryAuthor, metaAuthor) ?? 'Unknown';

	const contentItemDate = extractDate($, 'div.ContentItem-time');
	const fallbackDate = extractDate($, 'time');
	const date = selectNonEmpty(contentItemDate, fallbackDate) ?? '';

	return {title, author, date, url: sourceUrl};
}

export function extractAnswerMetadata(
	html: string,
	sourceUrl: string,
): ArticleMetadata {
	const $ = load(html);

	const primaryTitle = $('h1.QuestionHeader-title').text().trim();
	const metaTitle = $('meta[property="og:title"]').attr('content')?.trim();
	const title = selectNonEmpty(primaryTitle, metaTitle) ?? 'Untitled';

	const authorMeta = $('div.AuthorInfo')
		.find('meta[itemprop="name"]')
		.attr('content');
	const primaryAuthor = authorMeta?.trim();
	const metaAuthor = $('meta[property="og:author"]').attr('content')?.trim();
	const author = selectNonEmpty(primaryAuthor, metaAuthor) ?? 'Unknown';

	const contentItemDate = extractDate($, 'div.ContentItem-time');
	const fallbackDate = extractDate($, 'time');
	const date = selectNonEmpty(contentItemDate, fallbackDate) ?? '';

	return {title, author, date, url: sourceUrl};
}

export function extractVideoMetadata(
	html: string,
	sourceUrl: string,
): {metadata: ArticleMetadata; videoUrl: string | undefined} {
	const $ = load(html);

	// Extract video data from data-zop attribute
	const videoDiv = $('div.ZVideo-video');
	let title = 'Untitled';
	let author = 'Unknown';

	const dataZop = videoDiv.attr('data-zop');
	if (dataZop) {
		try {
			const zop = JSON.parse(dataZop) as {
				title?: string;
				authorName?: string;
			};
			title = zop.title ?? title;
			author = zop.authorName ?? author;
		} catch {
			// Ignore parse errors
		}
	}

	const date = extractDate($, 'div.ZVideo-meta');

	// Extract video URL from initialData
	let videoUrl: string | undefined;
	const script = $('#js-initialData');
	if (script.length > 0) {
		videoUrl = extractVideoUrlFromInitialData(script.text());
	}

	return {
		metadata: {title, author, date, url: sourceUrl},
		videoUrl,
	};
}

export function extractArticleContent(html: string): string {
	const $ = load(html);
	const content = $('div.Post-RichTextContainer');
	if (content.length > 0) {
		return content.html() ?? '';
	}

	// Fallback: try RichContent
	const richContent = $('div.RichContent-inner');
	return richContent.html() ?? '';
}

export function extractAnswerContent(html: string): string {
	const $ = load(html);
	const content = $('div.RichContent-inner');
	return content.html() ?? '';
}

export function extractColumnInfo(html: string): {
	title: string;
	totalArticles: number;
} {
	const $ = load(html);
	const text = $.text();
	const title = text.split('-')[0]?.trim() ?? 'Column';

	let totalArticles = -1;
	try {
		const countText = text.split('篇内容')[0]?.split('·').pop()?.trim();
		if (countText) {
			totalArticles = Number.parseInt(countText, 10);
			if (Number.isNaN(totalArticles)) totalArticles = -1;
		}
	} catch {
		// Ignore
	}

	return {title, totalArticles};
}
