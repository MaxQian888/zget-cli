import {writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import type {ZhihuApi} from '../api/zhihu-api';
import {
	extractArticleMetadata,
	extractArticleContent,
} from '../parser/metadata-extractor';
import {
	convertHtmlToMarkdown,
	buildMarkdownDocument,
} from '../parser/html-to-markdown';
import {buildMarkdownFilename, buildImageDir} from '../utils/file-naming';
import {downloadImages} from './image-downloader';
import type {DownloadOptions, DownloadResult} from './types';

export async function downloadArticle(
	articleId: string,
	api: ZhihuApi,
	options: DownloadOptions,
): Promise<DownloadResult> {
	const {outputDir, downloadImages: shouldDownloadImages, onProgress} = options;

	try {
		// Fetch article page
		onProgress?.({phase: 'fetching', message: '正在获取文章...'});
		const html = await api.getArticlePage(articleId);

		// Extract metadata
		onProgress?.({phase: 'parsing', message: '正在解析文章...'});
		const sourceUrl = `https://zhuanlan.zhihu.com/p/${articleId}`;
		const metadata = extractArticleMetadata(html, sourceUrl);
		const contentHtml = extractArticleContent(html);

		if (!contentHtml) {
			return {
				success: false,
				title: metadata.title,
				author: metadata.author,
				outputPath: '',
				imageCount: 0,
				error: '文章内容为空，可能需要登录才能访问',
			};
		}

		// Build output paths
		const filename = buildMarkdownFilename(
			metadata.title,
			metadata.author,
			metadata.date,
		);
		const imageDir = buildImageDir(metadata.title);
		const outputPath = join(outputDir, filename);

		// Convert to Markdown
		const {markdown, images} = convertHtmlToMarkdown(contentHtml, imageDir);
		const document = buildMarkdownDocument(
			metadata.title,
			metadata.author,
			sourceUrl,
			markdown,
		);

		// Ensure output directory
		await mkdir(outputDir, {recursive: true});

		// Download images
		let imageCount = 0;
		if (shouldDownloadImages && images.length > 0) {
			onProgress?.({
				phase: 'images',
				message: `正在下载 ${images.length} 张图片...`,
				total: images.length,
			});
			const result = await downloadImages(images, outputDir);
			imageCount = result.downloaded;
		}

		// Write Markdown file
		onProgress?.({phase: 'writing', message: '正在保存...'});
		await writeFile(outputPath, document, 'utf8');

		onProgress?.({phase: 'done', message: '完成'});
		return {
			success: true,
			title: metadata.title,
			author: metadata.author,
			outputPath,
			imageCount,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		onProgress?.({phase: 'error', message});
		return {
			success: false,
			title: '',
			author: '',
			outputPath: '',
			imageCount: 0,
			error: message,
		};
	}
}
