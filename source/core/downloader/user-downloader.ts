import {join} from 'node:path';
import {mkdir} from 'node:fs/promises';
import type {ApiClient} from '../api/client';
import type {ZhihuApi} from '../api/zhihu-api';
import {sanitizeFilename} from '../utils/file-naming';
import {DownloadTracker} from '../state/download-tracker';
import {downloadArticle} from './article-downloader';
import {downloadAnswer} from './answer-downloader';
import type {DownloadOptions, BatchProgress} from './types';

export type UserDownloadOptions = DownloadOptions & {
	resume: boolean;
	onBatchProgress?: (progress: BatchProgress) => void;
};

export async function downloadUserContent(
	userId: string,
	api: ZhihuApi,
	client: ApiClient,
	options: UserDownloadOptions,
): Promise<{success: number; failed: number; userName: string}> {
	const {outputDir, resume, onBatchProgress} = options;

	// Fetch user profile
	options.onProgress?.({phase: 'fetching', message: '正在获取用户信息...'});
	const profile = await api.getUserProfile(userId);
	const userName = profile.name || userId;
	const folderName = sanitizeFilename(`${userName}_知乎内容`);
	const userDir = join(outputDir, folderName);
	await mkdir(userDir, {recursive: true});

	const tracker = new DownloadTracker(`user-${userId}`);
	if (resume) {
		await tracker.load();
	}

	let success = 0;
	let failed = 0;
	const total = profile.articlesCount + profile.answerCount;

	const processArticles = async (
		items: Awaited<ReturnType<ZhihuApi['getUserArticles']>>['items'],
		index = 0,
	): Promise<void> => {
		const article = items[index];
		if (!article) {
			return;
		}

		const itemId = `article-${article.id}`;

		if (tracker.isCompleted(itemId)) {
			success++;
			return processArticles(items, index + 1);
		}

		try {
			const result = await downloadArticle(String(article.id), api, client, {
				...options,
				outputDir: userDir,
			});

			if (result.success) {
				tracker.markCompleted(itemId);
				success++;
			} else {
				tracker.markFailed(itemId, result.error ?? 'Unknown');
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
			currentItem: article.title || String(article.id),
		});
		await processArticles(items, index + 1);
	};

	const processArticlePage = async (offset: number): Promise<void> => {
		const {items, paging} = await api.getUserArticles(userId, offset);
		if (items.length === 0) {
			return;
		}

		await processArticles(items);
		if (!paging.is_end) {
			await processArticlePage(offset + 20);
		}
	};

	const processAnswers = async (
		items: Awaited<ReturnType<ZhihuApi['getUserAnswers']>>['items'],
		index = 0,
	): Promise<void> => {
		const answer = items[index];
		if (!answer) {
			return;
		}

		const itemId = `answer-${answer.id}`;

		if (tracker.isCompleted(itemId)) {
			success++;
			return processAnswers(items, index + 1);
		}

		try {
			const result = await downloadAnswer(
				String(answer.question.id),
				String(answer.id),
				api,
				{...options, outputDir: userDir},
			);

			if (result.success) {
				tracker.markCompleted(itemId);
				success++;
			} else {
				tracker.markFailed(itemId, result.error ?? 'Unknown');
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
			currentItem: answer.question.title || String(answer.id),
		});
		await processAnswers(items, index + 1);
	};

	const processAnswerPage = async (offset: number): Promise<void> => {
		const {items, paging} = await api.getUserAnswers(userId, offset);
		if (items.length === 0) {
			return;
		}

		await processAnswers(items);
		if (!paging.is_end) {
			await processAnswerPage(offset + 20);
		}
	};

	options.onProgress?.({phase: 'fetching', message: '正在下载文章...'});
	await processArticlePage(0);

	options.onProgress?.({phase: 'fetching', message: '正在下载回答...'});
	await processAnswerPage(0);

	return {success, failed, userName};
}
