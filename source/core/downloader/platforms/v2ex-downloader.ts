import {join} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';
import {type V2exApi} from '../../api/v2ex-api';
import {v2exTopicToMarkdown} from '../../parser/platforms/v2ex-parser';
import {sanitizeFilename} from '../../utils/file-naming';
import type {DownloadOptions, DownloadResult} from '../types';

const previewLength = 40;

export async function downloadV2exTopic(
	topicId: number | string,
	api: V2exApi,
	options: DownloadOptions,
): Promise<DownloadResult> {
	try {
		options.onProgress?.({phase: 'fetching', message: '正在获取主题...'});
		const topic = await api.getTopic(topicId);

		options.onProgress?.({phase: 'fetching', message: '正在获取回复...'});
		const replies = await api.getReplies(topic.id).catch(() => []);

		options.onProgress?.({phase: 'parsing', message: '正在转换为 Markdown...'});
		const markdown = v2exTopicToMarkdown(topic, replies);

		const author = topic.member?.username ?? 'v2ex';
		const preview = topic.title
			.replaceAll(/<[^>]+>/g, '')
			.trim()
			.slice(0, previewLength)
			.replaceAll(/\s+/g, '_');
		const dirName = sanitizeFilename(
			`${preview || `v2ex_${topic.id}`}-${topic.id}`,
		);
		const topicOutputDir = join(options.outputDir, 'v2ex', dirName);
		await mkdir(topicOutputDir, {recursive: true});

		options.onProgress?.({phase: 'writing', message: '正在保存...'});
		const filenameBase = sanitizeFilename(
			`${preview || String(topic.id)}_${author}`,
		);
		const outputPath = join(topicOutputDir, `${filenameBase}.md`);
		await writeFile(outputPath, markdown, 'utf8');

		options.onProgress?.({phase: 'done', message: '完成'});

		return {
			success: true,
			title: topic.title.slice(0, previewLength),
			author,
			outputPath,
			imageCount: 0,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			title: String(topicId),
			author: '',
			outputPath: '',
			imageCount: 0,
			error: message,
		};
	}
}
