import TurndownService from 'turndown';
import {addMathRules} from './math-rules';
import {addLinkRules} from './link-rules';
import {
	addImageRules,
	resetImageCollector,
	getCollectedImages,
	type ImageMapping,
} from './image-rules';

export type ConvertResult = {
	markdown: string;
	images: ImageMapping[];
};

export function convertHtmlToMarkdown(
	html: string,
	imageDir: string,
): ConvertResult {
	const turndown = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
		bulletListMarker: '-',
	});

	// Remove style tags
	turndown.remove('style');

	// Reset and setup image collection
	resetImageCollector();

	// Add custom rules (order matters - more specific rules first)
	addMathRules(turndown);
	addImageRules(turndown, imageDir);
	addLinkRules(turndown);

	// Convert
	const markdown = turndown.turndown(html);
	const images = getCollectedImages();

	return {markdown, images};
}

export function buildMarkdownDocument(
	title: string,
	author: string,
	sourceUrl: string,
	content: string,
): string {
	if (!content.trim()) {
		return `# ${title}\n\nContent is empty.`;
	}

	return `# ${title}\n\n**Author:** ${author}\n\n**Link:** ${sourceUrl}\n\n${content}`;
}
