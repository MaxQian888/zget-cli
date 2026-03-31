import {join} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';
import {type XApi} from '../../api/x-api';
import {
	tweetToMarkdown,
	userProfileToMarkdown,
} from '../../parser/platforms/x-parser';
import {sanitizeFilename} from '../../utils/file-naming';
import type {DownloadResult, DownloadOptions} from '../types';

export async function downloadTweet(
	tweetId: string,
	xApi: XApi,
	options: DownloadOptions,
): Promise<DownloadResult> {
	options.onProgress?.({phase: 'fetching', message: '正在获取推文...'});

	const resp = await xApi.getTweet(tweetId);
	const tweet = resp.data;
	const author = resp.includes?.users?.[0];

	options.onProgress?.({phase: 'parsing', message: '正在转换为 Markdown...'});

	const markdown = tweetToMarkdown(tweet, author);
	const authorName = author?.username ?? 'unknown';
	const title = tweet.text.slice(0, 50).replaceAll('\n', ' ');

	const filename = sanitizeFilename(`tweet_${authorName}_${tweetId}`);
	const outputDir = join(options.outputDir, 'x');
	await mkdir(outputDir, {recursive: true});
	const outputPath = join(outputDir, `${filename}.md`);

	options.onProgress?.({phase: 'writing', message: '正在保存...'});

	await writeFile(outputPath, markdown, 'utf8');

	options.onProgress?.({phase: 'done', message: '完成'});

	return {
		success: true,
		title: title || `Tweet ${tweetId}`,
		author: author?.name ?? authorName,
		outputPath,
		imageCount: 0,
	};
}

export async function downloadUserProfile(
	username: string,
	xApi: XApi,
	options: DownloadOptions,
): Promise<DownloadResult> {
	options.onProgress?.({
		phase: 'fetching',
		message: `正在获取用户 @${username} 信息...`,
	});

	const resp = await xApi.getUserByUsername(username);
	const user = resp.data;

	options.onProgress?.({phase: 'parsing', message: '正在转换为 Markdown...'});

	const markdown = userProfileToMarkdown(user);

	const filename = sanitizeFilename(`x_user_${username}`);
	const outputDir = join(options.outputDir, 'x');
	await mkdir(outputDir, {recursive: true});
	const outputPath = join(outputDir, `${filename}.md`);

	options.onProgress?.({phase: 'writing', message: '正在保存...'});

	await writeFile(outputPath, markdown, 'utf8');

	options.onProgress?.({phase: 'done', message: '完成'});

	return {
		success: true,
		title: `${user.name} (@${user.username})`,
		author: user.name,
		outputPath,
		imageCount: 0,
	};
}
