import {join} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';
import {type RedditApi} from '../../api/reddit-api';
import {
	redditCollectImageUrls,
	redditPostToMarkdown,
} from '../../parser/platforms/reddit-parser';
import {sanitizeFilename} from '../../utils/file-naming';
import {downloadImages} from '../image-downloader';
import type {DownloadOptions, DownloadResult} from '../types';

const previewLength = 40;

function urlExtension(url: string): string {
	const match = /\.([a-z\d]{3,4})(?:[?#]|$)/i.exec(url);
	if (!match) return '.jpg';
	return `.${match[1]!.toLowerCase()}`;
}

export async function downloadRedditPost(
	postId: string,
	api: RedditApi,
	options: DownloadOptions & {subreddit?: string},
): Promise<DownloadResult> {
	try {
		options.onProgress?.({phase: 'fetching', message: '正在获取帖子...'});
		const post = await api.getPost(postId, options.subreddit);

		options.onProgress?.({phase: 'fetching', message: '正在获取评论...'});
		const comments = await api
			.getComments(post.id, {subreddit: post.subreddit, limit: 100})
			.catch(() => []);

		options.onProgress?.({phase: 'parsing', message: '正在转换为 Markdown...'});
		const markdown = redditPostToMarkdown(post, comments);

		const preview = post.title
			.replaceAll(/<[^>]+>/g, '')
			.trim()
			.slice(0, previewLength)
			.replaceAll(/\s+/g, '_');
		const dirName = sanitizeFilename(
			`${preview || `reddit_${post.id}`}-${post.id}`,
		);
		const postOutputDir = join(
			options.outputDir,
			'reddit',
			post.subreddit,
			dirName,
		);
		await mkdir(postOutputDir, {recursive: true});

		let imageCount = 0;
		if (options.downloadImages) {
			const imageUrls = redditCollectImageUrls(post);
			if (imageUrls.length > 0) {
				options.onProgress?.({
					phase: 'images',
					message: `正在下载 ${imageUrls.length} 张图片...`,
					total: imageUrls.length,
				});
				const mappings = imageUrls.map((url, index) => ({
					originalUrl: url,
					localPath: `images/image_${index + 1}${urlExtension(url)}`,
				}));
				const result = await downloadImages(mappings, postOutputDir);
				imageCount = result.downloaded;
			}
		}

		options.onProgress?.({phase: 'writing', message: '正在保存...'});
		const filenameBase = sanitizeFilename(
			`${preview || post.id}_u-${post.author}`,
		);
		const outputPath = join(postOutputDir, `${filenameBase}.md`);
		await writeFile(outputPath, markdown, 'utf8');

		options.onProgress?.({phase: 'done', message: '完成'});

		return {
			success: true,
			title: post.title.slice(0, previewLength),
			author: post.author,
			outputPath,
			imageCount,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			title: postId,
			author: '',
			outputPath: '',
			imageCount: 0,
			error: message,
		};
	}
}
