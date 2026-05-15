import {join} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';
import {type WeiboApi} from '../../api/weibo-api';
import {
	weiboCollectImageUrls,
	weiboStatusToMarkdown,
} from '../../parser/platforms/weibo-parser';
import {sanitizeFilename} from '../../utils/file-naming';
import {downloadImages} from '../image-downloader';
import type {DownloadResult, DownloadOptions} from '../types';

const PREVIEW_LENGTH = 30;

export async function downloadWeiboStatus(
	idstr: string,
	api: WeiboApi,
	options: DownloadOptions,
): Promise<DownloadResult> {
	try {
		options.onProgress?.({phase: 'fetching', message: '正在获取微博...'});
		const status = await api.getStatus(idstr);

		let longText: string | undefined;
		if (status.isLongText || status.is_long_text) {
			options.onProgress?.({phase: 'fetching', message: '正在获取长文...'});
			longText = await api.getLongText(status.idstr).catch(() => undefined);
		}

		options.onProgress?.({phase: 'fetching', message: '正在获取评论...'});
		const comments = await api.getComments(status.idstr).catch(() => []);

		options.onProgress?.({phase: 'parsing', message: '正在转换为 Markdown...'});
		const markdown = weiboStatusToMarkdown(status, {longText, comments});

		const author = status.user?.screen_name ?? 'weibo';
		const preview = (status.text_raw ?? status.text ?? '')
			.replaceAll(/<[^>]+>/g, '')
			.trim()
			.slice(0, PREVIEW_LENGTH)
			.replaceAll(/\s+/g, '_');
		const dirBase = preview || `weibo_${status.idstr}`;
		const dirName = sanitizeFilename(`${dirBase}-${status.mid}`);
		const statusOutputDir = join(options.outputDir, 'weibo', dirName);
		await mkdir(statusOutputDir, {recursive: true});

		let imageCount = 0;
		if (options.downloadImages) {
			const imageUrls = weiboCollectImageUrls(status);
			if (imageUrls.length > 0) {
				options.onProgress?.({
					phase: 'images',
					message: `正在下载 ${imageUrls.length} 张图片...`,
					total: imageUrls.length,
				});

				const imageDir = join(statusOutputDir, 'images');
				const mappings = imageUrls.map((url, index) => ({
					originalUrl: url,
					localPath: `images/image_${index + 1}${urlExtension(url)}`,
				}));
				const result = await downloadImages(mappings, statusOutputDir);
				imageCount = result.downloaded;
				options.onProgress?.({
					phase: 'images',
					message: `图片下载完成 ${result.downloaded}/${imageUrls.length}`,
					current: result.downloaded,
					total: imageUrls.length,
				});
				// Touch imageDir variable for clarity (mkdir is handled by image-downloader)
				void imageDir;
			}
		}

		options.onProgress?.({phase: 'writing', message: '正在保存...'});
		const filenameBase = sanitizeFilename(
			`${preview || status.idstr}_${author}`,
		);
		const outputPath = join(statusOutputDir, `${filenameBase}.md`);
		await writeFile(outputPath, markdown, 'utf8');

		options.onProgress?.({phase: 'done', message: '完成'});

		return {
			success: true,
			title: preview || status.idstr,
			author,
			outputPath,
			imageCount,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			title: idstr,
			author: '',
			outputPath: '',
			imageCount: 0,
			error: message,
		};
	}
}

function urlExtension(url: string): string {
	const match = /\.([a-z\d]{3,4})(?:[?#]|$)/i.exec(url);
	if (!match) return '.jpg';
	return `.${match[1]!.toLowerCase()}`;
}
