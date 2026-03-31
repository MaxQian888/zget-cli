import type {XhsNote, XhsComment} from '../../api/xhs-types';

function formatTimestamp(ts: string): string {
	if (!ts) return '';
	// XHS timestamps can be unix ms or ISO string
	const n = Number(ts);
	const d = Number.isNaN(n) ? new Date(ts) : new Date(n);
	return d.toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function xhsNoteToMarkdown(
	note: XhsNote,
	comments?: XhsComment[],
): string {
	const lines: string[] = [];

	// Frontmatter
	lines.push(
		'---',
		'platform: 小红书 (Xiaohongshu)',
		`note_id: ${note.noteId}`,
		`author: ${note.user.nickname}`,
		`type: ${note.type === 'video' ? '视频' : '图文'}`,
		`likes: ${note.likeCount}`,
		`collects: ${note.collectCount}`,
		`comments: ${note.commentCount}`,
		`shares: ${note.shareCount}`,
	);
	if (note.createTime) {
		lines.push(`date: ${formatTimestamp(note.createTime)}`);
	}

	lines.push('---', '');

	// Title
	if (note.title) {
		lines.push(`# ${note.title}`, '');
	}

	// Author info
	lines.push(`**作者**: ${note.user.nickname}`, '');

	// Content
	if (note.description) {
		lines.push(note.description, '');
	}

	// Images
	if (note.imageList.length > 0) {
		lines.push('## 图片', '');
		for (const [i, img] of note.imageList.entries()) {
			const filename = `image_${String(i + 1).padStart(2, '0')}.jpg`;
			if (img.url) {
				lines.push(`![${filename}](${img.url})`);
			}
		}

		lines.push('');
	}

	// Video
	if (note.videoUrl) {
		lines.push('## 视频', '', `[视频链接](${note.videoUrl})`, '');
	}

	// Tags
	if (note.tags.length > 0) {
		lines.push(
			'## 标签',
			'',
			note.tags.map(tag => `#${tag.name}`).join(' '),
			'',
		);
	}

	// Engagement stats
	lines.push(
		'---',
		'',
		`❤️ ${note.likeCount} | ⭐ ${note.collectCount} | 💬 ${note.commentCount} | 🔗 ${note.shareCount}`,
		'',
	);

	// Comments
	if (comments && comments.length > 0) {
		lines.push('## 评论', '');
		for (const comment of comments) {
			lines.push(
				`**${comment.nickname}** (${formatTimestamp(comment.createTime)}):`,
				`> ${comment.content}`,
			);
			if (comment.likeCount) {
				lines.push(`> ❤️ ${comment.likeCount}`);
			}

			lines.push('');

			if (comment.subComments) {
				for (const sub of comment.subComments) {
					lines.push(
						`  **${sub.nickname}** (${formatTimestamp(sub.createTime)}):`,
						`  > ${sub.content}`,
						'',
					);
				}
			}
		}
	}

	lines.push(`> 来源: https://www.xiaohongshu.com/explore/${note.noteId}`);

	return lines.join('\n');
}

export function extractXhsImageUrls(note: XhsNote): string[] {
	return note.imageList.map(img => img.url).filter(Boolean);
}
