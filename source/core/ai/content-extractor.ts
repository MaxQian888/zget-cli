import * as cheerio from 'cheerio';
import type {SummaryRequest} from '../../types/ai';
import type {GlobalFlags} from '../../commands/types';
import {parseUrl} from '../utils/url-parser';
import {getHtmlHeaders} from '../utils/headers';
import {BiliCookieStore} from '../auth/bili-auth';
import {BiliApi} from '../api/bili-api';
import {biliSubtitleToText} from '../parser/platforms/bili-parser';

type ExtractedContent = {
	text: string;
	title?: string;
	platform: string;
	contentType: SummaryRequest['contentType'];
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

export async function extractContentForSummary(
	url: string,
	flags: GlobalFlags,
): Promise<ExtractedContent> {
	const parsed = parseUrl(url);

	switch (parsed.platform) {
		case 'bili': {
			return extractBiliContent(
				parsed.type === 'video' ? parsed.bvid : '',
				flags,
			);
		}

		case 'zhihu': {
			return extractZhihuContent(url);
		}

		case 'x': {
			return extractGenericContent(url, 'X (Twitter)', 'social-post');
		}

		case 'xhs': {
			return extractGenericContent(url, '小红书', 'social-post');
		}

		case 'csdn':
		case 'weixin':
		case 'juejin': {
			return extractArticleContent(url, parsed.platform);
		}

		default: {
			return extractGenericContent(url, '网页', 'article');
		}
	}
}

async function extractBiliContent(
	bvid: string,
	flags: GlobalFlags,
): Promise<ExtractedContent> {
	if (!bvid) throw new Error('无法解析 Bilibili 视频 ID');

	const cookieStore = new BiliCookieStore();
	await cookieStore.load();
	if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

	const api = new BiliApi(cookieStore);
	const videoInfo = await api.getVideoInfo(bvid);

	// Try to get subtitles first (best content for summarization)
	try {
		const subtitles = await api.getSubtitles(bvid);
		if (subtitles?.body && subtitles.body.length > 0) {
			return {
				text: biliSubtitleToText(subtitles),
				title: videoInfo.title,
				platform: 'Bilibili',
				contentType: 'video-subtitle',
			};
		}
	} catch {
		// Subtitles not available
	}

	// Fall back to description + comments
	const parts: string[] = [];
	if (videoInfo.desc) parts.push(videoInfo.desc);

	try {
		const comments = await api.getComments(bvid);
		if (comments.length > 0) {
			parts.push('\n评论:\n');
			for (const c of comments.slice(0, 10)) {
				parts.push(`${c.member.uname}: ${c.content.message}`);
			}
		}
	} catch {
		// Ignore
	}

	if (parts.length === 0) {
		throw new Error('无法提取视频内容（无字幕、无简介）');
	}

	return {
		text: parts.join('\n'),
		title: videoInfo.title,
		platform: 'Bilibili',
		contentType: 'article',
	};
}

async function extractZhihuContent(url: string): Promise<ExtractedContent> {
	const resp = await fetch(url, {
		headers: getHtmlHeaders(),
		redirect: 'follow',
	});

	if (!resp.ok) throw new Error(`获取知乎内容失败: ${resp.status}`);

	const html = await resp.text();
	const $ = cheerio.load(html);

	// Try to extract article content
	const postTitle = $('h1.Post-Title').text();
	const headingTitle = $('h1').first().text();
	const metaTitle = $('meta[property="og:title"]').attr('content') ?? '';
	const title = selectNonEmpty(postTitle, headingTitle, metaTitle) ?? '';

	const postContent = $('.Post-RichTextContainer').text();
	const richContent = $('.RichContent-inner').text();
	const articleContent = $('article').text();
	const metaDescription =
		$('meta[property="og:description"]').attr('content') ?? '';
	const content =
		selectNonEmpty(postContent, richContent, articleContent, metaDescription) ??
		'';

	if (!content) throw new Error('无法提取知乎内容');

	return {
		text: content.trim(),
		title: title.trim(),
		platform: '知乎',
		contentType: 'article',
	};
}

async function extractArticleContent(
	url: string,
	platform: string,
): Promise<ExtractedContent> {
	const platformNames: Record<string, string> = {
		csdn: 'CSDN',
		weixin: '微信公众号',
		juejin: '掘金',
	};

	const resp = await fetch(url, {
		headers: getHtmlHeaders(),
		redirect: 'follow',
	});

	if (!resp.ok) throw new Error(`获取内容失败: ${resp.status}`);

	const html = await resp.text();
	const $ = cheerio.load(html);

	const headingTitle = $('h1').first().text();
	const metaTitle = $('meta[property="og:title"]').attr('content') ?? '';
	const title = selectNonEmpty(headingTitle, metaTitle) ?? '';

	// Platform-specific selectors
	let content = '';
	switch (platform) {
		case 'csdn': {
			const articleContent = $('#article_content').text();
			const fallbackContent = $('.article_content').text();
			content = selectNonEmpty(articleContent, fallbackContent) ?? '';
			break;
		}

		case 'weixin': {
			const jsContent = $('#js_content').text();
			const richMediaContent = $('.rich_media_content').text();
			content = selectNonEmpty(jsContent, richMediaContent) ?? '';
			break;
		}

		case 'juejin': {
			const articleContent = $('.article-content').text();
			const fallbackContent = $('article').text();
			content = selectNonEmpty(articleContent, fallbackContent) ?? '';
			break;
		}

		default: {
			const articleContent = $('article').text();
			const mainContent = $('main').text();
			content =
				selectNonEmpty(articleContent, mainContent, $('body').text()) ?? '';
		}
	}

	if (!content.trim()) throw new Error('无法提取文章内容');

	return {
		text: content.trim(),
		title: title.trim(),
		platform: platformNames[platform] ?? platform,
		contentType: 'article',
	};
}

async function extractGenericContent(
	url: string,
	platform: string,
	contentType: ExtractedContent['contentType'],
): Promise<ExtractedContent> {
	const resp = await fetch(url, {
		headers: getHtmlHeaders(),
		redirect: 'follow',
	});

	if (!resp.ok) throw new Error(`获取内容失败: ${resp.status}`);

	const html = await resp.text();
	const $ = cheerio.load(html);

	const headingTitle = $('h1').first().text();
	const metaTitle = $('meta[property="og:title"]').attr('content') ?? '';
	const pageTitle = $('title').text();
	const title = selectNonEmpty(headingTitle, metaTitle, pageTitle) ?? '';

	// Try common content selectors
	const content =
		$('article').text() ||
		$('main').text() ||
		$('[role="main"]').text() ||
		$('.content').text() ||
		$('.post-content').text() ||
		$('body').text();

	if (!content.trim()) throw new Error('无法提取页面内容');

	// Clean up extracted text (remove excessive whitespace)
	const cleaned = content
		.replace(/\s+/g, ' ')
		.replace(/\n\s*\n/g, '\n\n')
		.trim();

	return {
		text: cleaned.slice(0, 200_000), // Limit to avoid huge content
		title: title.trim(),
		platform,
		contentType,
	};
}
