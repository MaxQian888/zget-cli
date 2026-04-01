import type TurndownService from 'turndown';

export type ImageMapping = {
	originalUrl: string;
	localPath: string;
};

let imageCollector: ImageMapping[] = [];
let imageIndex = 0;

export function resetImageCollector(): void {
	imageCollector = [];
	imageIndex = 0;
}

export function getCollectedImages(): ImageMapping[] {
	return [...imageCollector];
}

export function addImageRules(
	turndown: TurndownService,
	imageDir: string,
): void {
	turndown.addRule('platform-images', {
		filter: 'img',
		replacement(_content, node) {
			const element = node as HTMLImageElement;
			const dataset = element.dataset ?? {};
			const dataSrc = element.attributes.getNamedItem('data-src')?.value;
			const dataOriginal =
				element.attributes.getNamedItem('data-original')?.value;
			const dataActualSrc =
				element.attributes.getNamedItem('data-actualsrc')?.value;

			// Try all possible image source attributes across platforms:
			// - data-src: WeChat (微信公众号) primary image source
			// - data-original: Zhihu higher resolution
			// - data-actualsrc: Zhihu actual source
			// - src: standard fallback
			const src =
				dataset.src ??
				dataSrc ??
				dataset.original ??
				dataOriginal ??
				dataset.actualsrc ??
				dataActualSrc ??
				element.getAttribute('src') ??
				'';

			if (!src || src.startsWith('data:image/svg')) return '';

			// Skip lazy-load placeholders that have no real URL
			const className = element.getAttribute('class') ?? '';
			if (className.includes('lazy') && !src.startsWith('http')) return '';

			// Determine filename and extension
			const filename = buildImageFilename(src, imageIndex);
			imageIndex++;

			const localPath = `${imageDir}/${filename}`;
			const alt = element.getAttribute('alt') ?? '';

			imageCollector.push({originalUrl: src, localPath});

			return `![${alt}](${localPath})`;
		},
	});

	// Handle <figure> with <figcaption>
	turndown.addRule('platform-figure', {
		filter: 'figure',
		replacement(content) {
			return `\n${content}\n`;
		},
	});

	turndown.addRule('platform-figcaption', {
		filter: 'figcaption',
		replacement(content) {
			return content ? `\n*${content.trim()}*\n` : '';
		},
	});
}

/**
 * Build a proper image filename from URL.
 * Handles WeChat (wx_fmt param), Zhihu, CSDN, and generic URLs.
 */
function buildImageFilename(src: string, index: number): string {
	try {
		const url = new URL(src.startsWith('//') ? `https:${src}` : src);

		// WeChat: use wx_fmt query parameter for extension
		const wxFmt = url.searchParams.get('wx_fmt');
		if (wxFmt) {
			return `img_${String(index).padStart(2, '0')}.${wxFmt}`;
		}

		// Try to extract extension from URL path
		const pathParts = url.pathname.split('/');
		const lastPart = pathParts[pathParts.length - 1] ?? '';
		const extMatch = /\.(jpg|jpeg|png|gif|webp|svg|mp4)/i.exec(lastPart);
		if (extMatch) {
			// Use original filename if it has a valid extension
			const cleanName = lastPart.slice(0, extMatch.index + extMatch[0].length);
			// Avoid extremely long filenames
			if (cleanName.length <= 80) {
				return cleanName;
			}
		}

		// Fallback: sequential naming with .jpg
		return `img_${String(index).padStart(2, '0')}.jpg`;
	} catch {
		// If URL parsing fails, use sequential naming
		return `img_${String(index).padStart(2, '0')}.jpg`;
	}
}
