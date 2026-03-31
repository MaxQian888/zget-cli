import {join} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';
import {type BiliApi} from '../../api/bili-api';
import {biliVideoToMarkdown} from '../../parser/platforms/bili-parser';
import {sanitizeFilename} from '../../utils/file-naming';
import type {DownloadResult, DownloadOptions} from '../types';

export async function downloadBiliVideo(
	bvid: string,
	api: BiliApi,
	options: DownloadOptions,
): Promise<DownloadResult> {
	try {
		options.onProgress?.({phase: 'fetching', message: '正在获取视频信息...'});

		const videoInfo = await api.getVideoInfo(bvid);

		options.onProgress?.({phase: 'fetching', message: '正在获取字幕...'});
		const subtitles = await api.getSubtitles(bvid).catch(() => undefined);

		options.onProgress?.({phase: 'fetching', message: '正在获取评论...'});
		const comments = await api.getComments(bvid).catch(() => undefined);

		options.onProgress?.({phase: 'parsing', message: '正在转换为 Markdown...'});
		const markdown = biliVideoToMarkdown(
			videoInfo,
			subtitles,
			comments ?? undefined,
		);

		const dirName = sanitizeFilename(videoInfo.title || `bili_${bvid}`);
		const videoOutputDir = join(options.outputDir, 'bilibili', dirName);
		await mkdir(videoOutputDir, {recursive: true});

		options.onProgress?.({phase: 'writing', message: '正在保存...'});
		const outputPath = join(
			videoOutputDir,
			`${sanitizeFilename(videoInfo.title || bvid)}.md`,
		);
		await writeFile(outputPath, markdown, 'utf8');

		options.onProgress?.({phase: 'done', message: '完成'});

		return {
			success: true,
			title: videoInfo.title,
			author: videoInfo.owner.name,
			outputPath,
			imageCount: 0,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			title: bvid,
			author: '',
			outputPath: '',
			imageCount: 0,
			error: message,
		};
	}
}
