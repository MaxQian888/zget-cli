import {join} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';
import {type XhsApi} from '../../api/xhs-api';
import {
	xhsNoteToMarkdown,
	extractXhsImageUrls,
} from '../../parser/platforms/xhs-parser';
import {downloadImages} from '../image-downloader';
import type {ImageMapping} from '../../parser/image-rules';
import {sanitizeFilename} from '../../utils/file-naming';
import type {DownloadResult, DownloadOptions} from '../types';

export async function downloadXhsNote(
	noteId: string,
	xhsApi: XhsApi,
	options: DownloadOptions,
): Promise<DownloadResult> {
	try {
		options.onProgress?.({phase: 'fetching', message: '正在获取小红书笔记...'});

		const {note, comments} = await xhsApi.getNoteWithComments(noteId);

		options.onProgress?.({phase: 'parsing', message: '正在转换为 Markdown...'});

		const markdown = xhsNoteToMarkdown(note, comments);

		const dirName = sanitizeFilename(note.title || `xhs_${noteId}`);
		const noteOutputDir = join(options.outputDir, 'xhs', dirName);
		await mkdir(noteOutputDir, {recursive: true});

		// Download images if enabled
		let imageCount = 0;
		if (options.downloadImages && note.imageList.length > 0) {
			const imageUrls = extractXhsImageUrls(note);
			if (imageUrls.length > 0) {
				options.onProgress?.({
					phase: 'images',
					message: '正在下载图片...',
					current: 0,
					total: imageUrls.length,
				});

				const imageDir = join(noteOutputDir, 'images');
				await mkdir(imageDir, {recursive: true});

				// Convert URLs to ImageMapping format
				const imageMappings: ImageMapping[] = imageUrls.map((url, i) => ({
					originalUrl: url,
					localPath: `image_${String(i + 1).padStart(2, '0')}.jpg`,
				}));

				const {downloaded} = await downloadImages(imageMappings, imageDir);
				imageCount = downloaded;
			}
		}

		// Write markdown
		options.onProgress?.({phase: 'writing', message: '正在保存...'});
		const outputPath = join(
			noteOutputDir,
			`${sanitizeFilename(note.title || noteId)}.md`,
		);
		await writeFile(outputPath, markdown, 'utf8');

		options.onProgress?.({phase: 'done', message: '完成'});

		return {
			success: true,
			title: note.title || `小红书笔记 ${noteId}`,
			author: note.user.nickname,
			outputPath,
			imageCount,
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			title: noteId,
			author: '',
			outputPath: '',
			imageCount: 0,
			error: message,
		};
	}
}
