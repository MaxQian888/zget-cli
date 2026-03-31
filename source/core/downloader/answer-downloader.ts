import {writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import type {ApiClient} from '../api/client';
import type {ZhihuApi} from '../api/zhihu-api';
import {
	extractAnswerMetadata,
	extractAnswerContent,
} from '../parser/metadata-extractor';
import {
	convertHtmlToMarkdown,
	buildMarkdownDocument,
} from '../parser/html-to-markdown';
import {buildMarkdownFilename, buildImageDir} from '../utils/file-naming';
import {downloadImages} from './image-downloader';
import type {DownloadOptions, DownloadResult} from './types';

export async function downloadAnswer(
	questionId: string,
	answerId: string,
	api: ZhihuApi,
	_client: ApiClient,
	options: DownloadOptions,
): Promise<DownloadResult> {
	const {outputDir, downloadImages: shouldDownloadImages, onProgress} = options;

	try {
		onProgress?.({phase: 'fetching', message: '正在获取回答...'});
		const html = await api.getAnswerPage(questionId, answerId);

		onProgress?.({phase: 'parsing', message: '正在解析回答...'});
		const sourceUrl = `https://www.zhihu.com/question/${questionId}/answer/${answerId}`;
		const metadata = extractAnswerMetadata(html, sourceUrl);
		const contentHtml = extractAnswerContent(html);

		if (!contentHtml) {
			return {
				success: false,
				title: metadata.title,
				author: metadata.author,
				outputPath: '',
				imageCount: 0,
				error: '回答内容为空，可能需要登录才能访问',
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
			sourceUrl,
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
