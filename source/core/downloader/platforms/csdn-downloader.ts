import {writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import type {ApiClient} from '../../api/client';
import {
	extractCsdnMetadata,
	extractCsdnContent,
	extractCsdnCategoryInfo,
} from '../../parser/platforms/csdn-parser';
import {
	convertHtmlToMarkdown,
	buildMarkdownDocument,
} from '../../parser/html-to-markdown';
import {downloadImages} from '../image-downloader';
import {
	buildMarkdownFilename,
	buildImageDir,
	sanitizeFilename,
} from '../../utils/file-naming';
import {DownloadTracker} from '../../state/download-tracker';
import type {DownloadOptions, DownloadResult, BatchProgress} from '../types';

export async function downloadCsdnArticle(
	url: string,
	client: ApiClient,
	options: DownloadOptions,
): Promise<DownloadResult> {
	const {outputDir, downloadImages: shouldDownloadImages, onProgress} = options;

	try {
		onProgress?.({phase: 'fetching', message: '正在获取 CSDN 文章...'});
		const html = await client.getHtml(url);

		onProgress?.({phase: 'parsing', message: '正在解析文章...'});
		const metadata = extractCsdnMetadata(html, url);
		const contentHtml = extractCsdnContent(html);

		if (!contentHtml) {
			return {
				success: false,
				title: metadata.title,
				author: metadata.author,
				outputPath: '',
				imageCount: 0,
				error: 'CSDN 文章内容为空',
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

export type CsdnCategoryOptions = DownloadOptions & {
	resume: boolean;
	onBatchProgress?: (progress: BatchProgress) => void;
};

export async function downloadCsdnCategory(
	url: string,
	client: ApiClient,
	options: CsdnCategoryOptions,
): Promise<{success: number; failed: number; folderName: string}> {
	const {outputDir, resume, onBatchProgress} = options;

	options.onProgress?.({
		phase: 'fetching',
		message: '正在获取 CSDN 专栏信息...',
	});
	const html = await client.getHtml(url);
	const {title, articleUrls} = extractCsdnCategoryInfo(html);

	const folderName = sanitizeFilename(title);
	const categoryDir = join(outputDir, folderName);
	await mkdir(categoryDir, {recursive: true});

	const tracker = new DownloadTracker(`csdn-category-${folderName}`);
	if (resume) await tracker.load();

	let success = 0;
	let failed = 0;

	const processArticle = async (index = 0): Promise<void> => {
		const articleUrl = articleUrls[index];
		if (!articleUrl) {
			return;
		}

		const articleId = articleUrl.split('/').pop() ?? articleUrl;

		if (tracker.isCompleted(articleId)) {
			success++;
			onBatchProgress?.({
				completed: success,
				failed,
				total: articleUrls.length,
				currentItem: `(已完成) ${articleId}`,
			});
			return processArticle(index + 1);
		}

		try {
			const result = await downloadCsdnArticle(articleUrl, client, {
				...options,
				outputDir: categoryDir,
			});
			if (result.success) {
				tracker.markCompleted(articleId);
				success++;
			} else {
				tracker.markFailed(articleId, result.error ?? 'Unknown');
				failed++;
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			tracker.markFailed(articleId, message);
			failed++;
		}

		await tracker.save();
		onBatchProgress?.({
			completed: success,
			failed,
			total: articleUrls.length,
			currentItem: articleId,
		});
		await processArticle(index + 1);
	};

	await processArticle();

	return {success, failed, folderName};
}

export {isCsdnCategory} from '../../parser/platforms/csdn-parser';
