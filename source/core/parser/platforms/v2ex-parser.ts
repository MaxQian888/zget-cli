import TurndownService from 'turndown';
import type {V2exReply, V2exTopic} from '../../../types/v2ex';
import {buildV2exMemberUrl, buildV2exTopicUrl} from '../../utils/url-parser';

function htmlToMarkdown(html: string): string {
	if (!html) return '';
	const td = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
		bulletListMarker: '-',
	});
	return td.turndown(html);
}

function formatTimestamp(unix?: number): string {
	if (!unix) return '';
	return new Date(unix * 1000).toISOString();
}

// eslint-disable-next-line complexity
export function v2exTopicToMarkdown(
	topic: V2exTopic,
	replies: V2exReply[] = [],
): string {
	const lines: string[] = [];
	lines.push(
		`# ${topic.title}`,
		'',
		'## 元数据',
		'',
		`- ID: \`${topic.id}\``,
		`- URL: ${buildV2exTopicUrl(String(topic.id))}`,
	);
	if (topic.member?.username) {
		lines.push(
			`- 作者: [${topic.member.username}](${buildV2exMemberUrl(
				topic.member.username,
			)})`,
		);
	}

	if (topic.node?.title) {
		lines.push(`- 节点: ${topic.node.title} (\`${topic.node.name}\`)`);
	}

	if (topic.created) {
		lines.push(`- 发布时间: ${formatTimestamp(topic.created)}`);
	}

	if (typeof topic.replies === 'number') {
		lines.push(`- 回复数: ${topic.replies}`);
	}

	lines.push('', '## 正文', '');
	const body =
		htmlToMarkdown(topic.content_rendered ?? '') || (topic.content ?? '');
	lines.push(body || '> (无正文)');

	if (topic.supplements && topic.supplements.length > 0) {
		for (const [i, s] of topic.supplements.entries()) {
			lines.push('', `## 补充 #${i + 1}`, '');
			const rendered =
				htmlToMarkdown(s.content_rendered ?? '') || (s.content ?? '');
			lines.push(rendered || '> (空)');
		}
	}

	if (replies.length > 0) {
		lines.push('', '## 回复', '');
		for (const [i, r] of replies.entries()) {
			const author = r.member?.username
				? `[${r.member.username}](${buildV2exMemberUrl(r.member.username)})`
				: '(unknown)';
			lines.push(`### #${i + 1} — ${author}`);
			if (typeof r.thanks === 'number' && r.thanks > 0) {
				lines.push(`- 👍 ${r.thanks}`);
			}

			const rendered =
				htmlToMarkdown(r.content_rendered ?? '') || (r.content ?? '');
			lines.push('', rendered || '> (空回复)', '');
		}
	}

	return lines.join('\n');
}
