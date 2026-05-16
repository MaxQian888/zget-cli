import {join} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';
import {type HnApi} from '../../api/hn-api';
import {hnItemToMarkdown} from '../../parser/platforms/hn-parser';
import {sanitizeFilename} from '../../utils/file-naming';
import type {DownloadResult, DownloadOptions} from '../types';

const previewLength = 40;

export async function downloadHnItem(
	itemId: string | number,
	api: HnApi,
	options: DownloadOptions,
): Promise<DownloadResult> {
	try {
		options.onProgress?.({phase: 'fetching', message: '正在获取 HN item...'});
		const item = await api.getItem(itemId);

		options.onProgress?.({phase: 'fetching', message: '正在获取评论树...'});
		const comments = await api
			.getComments(item.id, {maxDepth: 3, perLevel: 30})
			.catch(() => []);

		options.onProgress?.({phase: 'parsing', message: '正在转换为 Markdown...'});
		const markdown = hnItemToMarkdown(item, comments, {
			includeComments: comments.length > 0,
		});

		const title = item.title ?? item.text ?? `hn-${item.id}`;
		const preview = title
			.replaceAll(/<[^>]+>/g, '')
			.trim()
			.slice(0, previewLength)
			.replaceAll(/\s+/g, '_');
		const author = item.by ?? 'hn';
		const dirName = sanitizeFilename(
			`${preview || `hn_${item.id}`}-${item.id}`,
		);
		const itemOutputDir = join(options.outputDir, 'hn', dirName);
		await mkdir(itemOutputDir, {recursive: true});

		options.onProgress?.({phase: 'writing', message: '正在保存...'});
		const filenameBase = sanitizeFilename(
			`${preview || String(item.id)}_${author}`,
		);
		const outputPath = join(itemOutputDir, `${filenameBase}.md`);
		await writeFile(outputPath, markdown, 'utf8');

		options.onProgress?.({phase: 'done', message: '完成'});

		return {
			success: true,
			title: title.slice(0, previewLength),
			author,
			outputPath,
			imageCount: 0,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			title: String(itemId),
			author: '',
			outputPath: '',
			imageCount: 0,
			error: message,
		};
	}
}
