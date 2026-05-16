import {describe, expect, it} from 'vitest';
import {
	hnCollectImageUrls,
	hnItemToMarkdown,
} from '../../../../source/core/parser/platforms/hn-parser';
import type {HnItem} from '../../../../source/types/hn';

describe('hn-parser', () => {
	it('renders a story with metadata + body', () => {
		const item: HnItem = {
			id: 1,
			type: 'story',
			title: 'Hello world',
			by: 'pg',
			time: 1_700_000_000,
			score: 100,
			descendants: 10,
			url: 'https://example.com',
			text: '<p>HN body with <a href="https://x">link</a></p>',
		};
		const out = hnItemToMarkdown(item);
		expect(out).toContain('# Hello world');
		expect(out).toContain('- ID: `1`');
		expect(out).toContain(
			'- 作者: [pg](https://news.ycombinator.com/user?id=pg)',
		);
		expect(out).toContain('- 分数: 100');
		expect(out).toContain('HN body with [link](https://x)');
	});

	it('falls back to "(no body)" placeholder when the item has only a URL', () => {
		const item: HnItem = {
			id: 2,
			type: 'story',
			title: 'External link',
			url: 'https://example.com',
		};
		const out = hnItemToMarkdown(item);
		expect(out).toContain('外链文章: <https://example.com>');
	});

	it('renders the comment tree section when includeComments is set', () => {
		const item: HnItem = {id: 1, title: 'root', type: 'story'};
		const comments: HnItem[] = [
			{
				id: 11,
				parent: 1,
				by: 'a',
				text: '<p>top-level reply</p>',
				type: 'comment',
			},
			{
				id: 12,
				parent: 11,
				by: 'b',
				text: '<p>nested reply</p>',
				type: 'comment',
			},
		];
		const out = hnItemToMarkdown(item, comments, {includeComments: true});
		expect(out).toContain('## 评论树');
		expect(out).toContain('top-level reply');
		expect(out).toContain('nested reply');
		// Nested reply should be indented one level deeper.
		const nestedLine = out.split('\n').find(l => l.includes('nested reply'));
		expect(nestedLine?.startsWith('> > ')).toBe(true);
	});

	it('hnCollectImageUrls returns an empty array (HN bodies are text)', () => {
		const item: HnItem = {id: 1, type: 'story', title: 'x'};
		expect(hnCollectImageUrls(item)).toEqual([]);
	});
});
