import {join} from 'node:path';
import {mkdir} from 'node:fs/promises';
import type {ApiClient} from '../api/client';
import type {ZhihuApi} from '../api/zhihu-api';
import {extractColumnInfo} from '../parser/metadata-extractor';
import {sanitizeFilename} from '../utils/file-naming';
import {DownloadTracker} from '../state/download-tracker';
import {downloadArticle} from './article-downloader';
import {downloadAnswer} from './answer-downloader';
import {downloadVideo} from './video-downloader';
import type {DownloadOptions, BatchProgress} from './types';

export type ColumnDownloadOptions = DownloadOptions & {
	resume: boolean;
	onBatchProgress?: (progress: BatchProgress) => void;
};

export async function downloadColumn(
	columnId: string,
	api: ZhihuApi,
	client: ApiClient,
	options: ColumnDownloadOptions,
): Promise<{
	success: number;
	failed: number;
	total: number;
	folderName: string;
}> {
	const {outputDir, resume, onBatchProgress} = options;

	// Fetch column page for metadata
	options.onProgress?.({phase: 'fetching', message: '正在获取专栏信息...'});
	const html = await api.getColumnPage(columnId);
	const {title, totalArticles} = extractColumnInfo(html);

	const folderName = sanitizeFilename(title);
	const columnDir = join(outputDir, folderName);
	await mkdir(columnDir, {recursive: true});

	// Setup tracker for resume
	const tracker = new DownloadTracker(`column-${columnId}`);
	if (resume) {
		await tracker.load();
	}

	let success = 0;
	let failed = 0;
	const total = totalArticles > 0 ? totalArticles : 0;

	const processItem = async (
		items: Awaited<ReturnType<ZhihuApi['getColumnItems']>>['items'],
		index = 0,
	): Promise<void> => {
		const item = items[index];
		if (!item) {
			return;
		}

		const itemId = String(item.id);

		if (tracker.isCompleted(itemId)) {
			success++;
			onBatchProgress?.({
				completed: success,
				failed,
				total,
				currentItem: `(已完成) ${itemId}`,
			});
			return processItem(items, index + 1);
		}

		const itemOptions: DownloadOptions = {
			...options,
			outputDir: columnDir,
		};

		try {
			let result;
			if (item.type === 'article') {
				result = await downloadArticle(itemId, api, client, itemOptions);
			} else if (item.type === 'answer' && item.question) {
				result = await downloadAnswer(
					String(item.question.id),
					itemId,
					api,
					itemOptions,
				);
			} else if (item.type === 'zvideo') {
				result = await downloadVideo(itemId, api, client, itemOptions);
			} else {
				await processItem(items, index + 1);
				return;
			}

			if (result.success) {
				tracker.markCompleted(itemId);
				success++;
			} else {
				tracker.markFailed(itemId, result.error ?? 'Unknown error');
				failed++;
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			tracker.markFailed(itemId, message);
			failed++;
		}

		await tracker.save();
		onBatchProgress?.({
			completed: success,
			failed,
			total,
			currentItem: item.title ?? itemId,
		});
		await processItem(items, index + 1);
	};

	const processPage = async (offset: number): Promise<void> => {
		const {items, paging} = await api.getColumnItems(columnId, offset);
		await processItem(items);
		if (!paging.is_end) {
			await processPage(offset + 10);
		}
	};

	await processPage(0);

	return {success, failed, total: success + failed, folderName};
}
