import sanitize from 'sanitize-filename';

export function sanitizeFilename(name: string): string {
	const cleaned = sanitize(name.trim().replaceAll(/\s+/g, '_'), {
		replacement: '_',
	});
	// Limit filename length to avoid filesystem issues
	return cleaned.slice(0, 200) || 'untitled';
}

export function buildMarkdownFilename(
	title: string,
	author: string,
	date?: string,
): string {
	const safeName = sanitizeFilename(title);
	const safeAuthor = sanitizeFilename(author);
	if (date) {
		return `(${date})${safeName}_${safeAuthor}.md`;
	}

	return `${safeName}_${safeAuthor}.md`;
}

export function buildImageDir(markdownTitle: string): string {
	return sanitizeFilename(markdownTitle);
}
