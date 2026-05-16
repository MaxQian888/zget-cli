import TurndownService from 'turndown';
import type {HnItem} from '../../../types/hn';
import {buildHnItemUrl, buildHnUserUrl} from '../../utils/url-parser';

// HN item bodies are short HTML fragments (<p>, <a>, <i>, <pre>). We don't
// need the full image-collecting pipeline that other platforms use; a fresh
// Turndown service per call is cheap.
function htmlToMarkdown(html: string): string {
	if (!html) return '';
	const td = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
		bulletListMarker: '-',
	});
	return td.turndown(html);
}

// Hacker News item bodies arrive as a small HTML fragment (paragraphs + <a>
// + <i>) in `item.text`. We pass it through the shared turndown converter for
// consistency with the other platforms.

export type HnRenderOptions = {
	includeComments?: boolean;
	commentDepth?: number;
};

function formatTimestamp(unix?: number): string {
	if (!unix) return '';
	const date = new Date(unix * 1000);
	return date.toISOString();
}

function renderItemBody(item: HnItem): string {
	if (!item.text) return '';
	return htmlToMarkdown(item.text);
}

export function hnItemToMarkdown(
	item: HnItem,
	comments: HnItem[] = [],
	options: HnRenderOptions = {},
): string {
	const lines: string[] = [];

	const title =
		item.title ?? item.text?.split('\n')[0] ?? `HN item #${item.id}`;
	lines.push(
		`# ${title}`,
		'',
		'## 元数据',
		'',
		`- ID: \`${item.id}\``,
		`- URL: ${buildHnItemUrl(String(item.id))}`,
	);
	if (item.url) lines.push(`- 外链: <${item.url}>`);
	if (item.by) lines.push(`- 作者: [${item.by}](${buildHnUserUrl(item.by)})`);
	if (item.time) lines.push(`- 发布时间: ${formatTimestamp(item.time)}`);
	if (typeof item.score === 'number') lines.push(`- 分数: ${item.score}`);
	if (typeof item.descendants === 'number') {
		lines.push(`- 评论数: ${item.descendants}`);
	}

	lines.push('', '## 正文', '');
	const body = renderItemBody(item);
	if (body) {
		lines.push(body);
	} else if (item.url) {
		lines.push(`> 外链文章: <${item.url}>`);
	} else {
		lines.push('> (无正文)');
	}

	if (options.includeComments && comments.length > 0) {
		lines.push('', '## 评论树', '');
		const byId = new Map<number, HnItem>();
		for (const c of comments) byId.set(c.id, c);
		// Each comment has parent and depth in the tree. We render flat, but
		// indent with quote depth derived from the parent chain.
		for (const c of comments) {
			let depth = 0;
			let current: HnItem | undefined = c;
			while (current?.parent && current.parent !== item.id) {
				depth += 1;
				current = byId.get(current.parent);
				if (depth > 10) break;
			}

			const prefix = '> '.repeat(depth + 1);
			const author = c.by ? `[${c.by}](${buildHnUserUrl(c.by)})` : '(unknown)';
			lines.push(`${prefix}**${author}** · #${c.id}`);
			const text = htmlToMarkdown(c.text ?? '').trim();
			for (const line of text.split('\n')) {
				lines.push(`${prefix}${line}`);
			}

			lines.push(prefix.trimEnd());
		}
	}

	return lines.join('\n');
}

export function hnCollectImageUrls(_item: HnItem): string[] {
	// HN items are text-only; images live in linked URLs, which we don't fetch.
	return [];
}
