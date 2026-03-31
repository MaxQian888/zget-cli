import {writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import type {ApiClient} from '../../api/client';
import {
	extractJuejinMetadata,
	extractJuejinContent,
} from '../../parser/platforms/juejin-parser';
import {
	convertHtmlToMarkdown,
	buildMarkdownDocument,
} from '../../parser/html-to-markdown';
import {downloadImages} from '../image-downloader';
import {buildMarkdownFilename, buildImageDir} from '../../utils/file-naming';
import type {DownloadOptions, DownloadResult} from '../types';

export async function downloadJuejinArticle(
	url: string,
	client: ApiClient,
	options: DownloadOptions,
): Promise<DownloadResult> {
	const {outputDir, downloadImages: shouldDownloadImages, onProgress} = options;

	try {
		onProgress?.({phase: 'fetching', message: '正在获取掘金文章...'});
		const html = await client.getHtml(url);

		onProgress?.({phase: 'parsing', message: '正在解析文章...'});
		const metadata = extractJuejinMetadata(html, url);
		const contentHtml = extractJuejinContent(html);

		if (!contentHtml) {
			return {
				success: false,
				title: metadata.title,
				author: metadata.author,
				outputPath: '',
				imageCount: 0,
				error: '掘金文章内容为空',
			};
		}

		const filename = buildMarkdownFilename(
			metadata.title,
			metadata.author,
			metadata.date,
		);
		const imageDir = buildImageDir(metadata.title);
		const outputPath = join(outputDir, filename);

		const {markdown, images} = convertHtmlToMarkdown(contentHtml, imageDir);
		const document = buildMarkdownDocument(
			metadata.title,
			metadata.author,
			url,
			markdown,
		);

		await mkdir(outputDir, {recursive: true});

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
