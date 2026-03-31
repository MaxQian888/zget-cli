import {writeFile, mkdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import type {ApiClient} from '../api/client';
import type {ZhihuApi} from '../api/zhihu-api';
import {extractVideoMetadata} from '../parser/metadata-extractor';
import {sanitizeFilename} from '../utils/file-naming';
import type {DownloadOptions, DownloadResult} from './types';

export async function downloadVideo(
	videoId: string,
	api: ZhihuApi,
	client: ApiClient,
	options: DownloadOptions,
): Promise<DownloadResult> {
	const {outputDir, onProgress} = options;

	try {
		onProgress?.({phase: 'fetching', message: '正在获取视频信息...'});
		const sourceUrl = `https://www.zhihu.com/zvideo/${videoId}`;
		const html = await api.getVideoPage(videoId);

		onProgress?.({phase: 'parsing', message: '正在解析视频...'});
		const {metadata, videoUrl} = extractVideoMetadata(html, sourceUrl);

		if (!videoUrl) {
			return {
				success: false,
				title: metadata.title,
				author: metadata.author,
				outputPath: '',
				imageCount: 0,
				error: '无法获取视频下载地址',
			};
		}

		const safeTitle = sanitizeFilename(metadata.title);
		const filename = metadata.date
			? `(${metadata.date})${safeTitle}_${sanitizeFilename(
					metadata.author,
			  )}.mp4`
			: `${safeTitle}_${sanitizeFilename(metadata.author)}.mp4`;
		const outputPath = join(outputDir, filename);

		await mkdir(dirname(outputPath), {recursive: true});

		onProgress?.({phase: 'images', message: '正在下载视频...'});
		const buffer = await client.getBuffer(videoUrl);

		onProgress?.({phase: 'writing', message: '正在保存视频...'});
		await writeFile(outputPath, buffer);

		onProgress?.({phase: 'done', message: '完成'});
		return {
			success: true,
			title: metadata.title,
			author: metadata.author,
			outputPath,
			imageCount: 0,
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
