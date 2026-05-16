import {describe, expect, it} from 'vitest';
import {v2exTopicToMarkdown} from '../../../../source/core/parser/platforms/v2ex-parser';
import type {V2exReply, V2exTopic} from '../../../../source/types/v2ex';

describe('v2ex-parser', () => {
	it('renders topic metadata + content', () => {
		const topic: V2exTopic = {
			id: 7,
			title: 'Hello V2EX',
			content: 'Plain body',
			content_rendered: '<p>Rendered <strong>body</strong></p>',
			replies: 3,
			created: 1_700_000_000,
			member: {id: 1, username: 'alice'},
			node: {id: 1, name: 'go', title: 'Go'},
		};
		const out = v2exTopicToMarkdown(topic);
		expect(out).toContain('# Hello V2EX');
		expect(out).toContain('- 作者: [alice](https://v2ex.com/member/alice)');
		expect(out).toContain('节点: Go (`go`)');
		expect(out).toContain('Rendered **body**');
	});

	it('falls back to (无正文) when both rendered and raw are empty', () => {
		const topic: V2exTopic = {
			id: 1,
			title: 'x',
			replies: 0,
			created: 0,
		};
		const out = v2exTopicToMarkdown(topic);
		expect(out).toContain('(无正文)');
	});

	it('renders supplements when present', () => {
		const topic: V2exTopic = {
			id: 2,
			title: 't',
			replies: 0,
			created: 0,
			supplements: [
				{id: 1, content_rendered: '<p>Add 1</p>'},
				{id: 2, content: 'Add 2'},
			],
		};
		const out = v2exTopicToMarkdown(topic);
		expect(out).toContain('## 补充 #1');
		expect(out).toContain('Add 1');
		expect(out).toContain('Add 2');
	});

	it('renders replies with thanks and author', () => {
		const topic: V2exTopic = {id: 1, title: 'x', replies: 0, created: 0};
		const replies: V2exReply[] = [
			{
				id: 100,
				created: 0,
				thanks: 2,
				content_rendered: '<p>reply body</p>',
				member: {id: 9, username: 'bob'},
			},
		];
		const out = v2exTopicToMarkdown(topic, replies);
		expect(out).toContain('## 回复');
		expect(out).toContain('### #1 — [bob](https://v2ex.com/member/bob)');
		expect(out).toContain('👍 2');
		expect(out).toContain('reply body');
	});
});
