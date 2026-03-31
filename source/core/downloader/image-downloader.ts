import {Buffer} from 'node:buffer';
import {writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {existsSync} from 'node:fs';
import type {ImageMapping} from '../parser/image-rules';
import {getHtmlHeaders} from '../utils/headers';

/**
 * Determine the correct Referer header for an image URL.
 * Anti-hotlinking protection requires matching Referer for each platform.
 */
function getRefererForImage(imageUrl: string): string {
	if (imageUrl.includes('mmbiz.qpic.cn') || imageUrl.includes('mmbiz.')) {
		return 'https://mp.weixin.qq.com/';
	}

	if (imageUrl.includes('zhimg.com') || imageUrl.includes('zhihu.com')) {
		return 'https://www.zhihu.com/';
	}

	if (imageUrl.includes('csdn.net') || imageUrl.includes('csdnimg.cn')) {
		return 'https://blog.csdn.net/';
	}

	if (imageUrl.includes('juejin') || imageUrl.includes('byteimg.com')) {
		return 'https://juejin.cn/';
	}

	return '';
}

export async function downloadImages(
	images: ImageMapping[],
	baseDir: string,
	concurrency = 3,
): Promise<{downloaded: number; failed: number}> {
	let downloaded = 0;
	let failed = 0;

	const processBatch = async (startIndex = 0): Promise<void> => {
		const batch = images.slice(startIndex, startIndex + concurrency);
		if (batch.length === 0) {
			return;
		}

		const results = await Promise.allSettled(
			batch.map(async image => {
				const fullPath = `${baseDir}/${image.localPath}`;

				// Skip if already exists
				if (existsSync(fullPath)) {
					downloaded++;
					return;
				}

				try {
					await mkdir(dirname(fullPath), {recursive: true});

					let url = image.originalUrl;
					// Normalize protocol-relative URLs
					if (url.startsWith('//')) {
						url = `https:${url}`;
					}

					// Handle data URIs
					if (url.startsWith('data:image/')) {
						const commaIndex = url.indexOf(',');
						if (commaIndex !== -1) {
							const data = Buffer.from(url.slice(commaIndex + 1), 'base64');
							await writeFile(fullPath, data);
							downloaded++;
							return;
						}
					}

					// Build headers with correct Referer for anti-hotlinking
					const headers: Record<string, string> = {
						...getHtmlHeaders(),
					};
					const referer = getRefererForImage(url);
					if (referer) {
						headers.Referer = referer;
					}

					const response = await fetch(url, {headers});
					if (!response.ok) {
						failed++;
						return;
					}

					const arrayBuffer = await response.arrayBuffer();
					await writeFile(fullPath, Buffer.from(arrayBuffer));
					downloaded++;
				} catch {
					failed++;
				}
			}),
		);

		// Count any unexpected rejections
		for (const r of results) {
			if (r.status === 'rejected') {
				failed++;
			}
		}

		await processBatch(startIndex + concurrency);
	};

	await processBatch();

	return {downloaded, failed};
}
