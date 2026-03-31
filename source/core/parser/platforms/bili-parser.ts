import type {
	BiliVideoInfo,
	BiliSubtitleContent,
	BiliComment,
} from '../../../types/bilibili';

function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0)
		return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimestamp(unix: number): string {
	const d = new Date(unix * 1000);
	return d.toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatCount(n: number): string {
	if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
	if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
	return String(n);
}

export function biliVideoToMarkdown(
	info: BiliVideoInfo,
	subtitles?: BiliSubtitleContent | undefined,
	comments?: BiliComment[],
): string {
	const lines: string[] = [];

	// Frontmatter
	lines.push(
		'---',
		'platform: Bilibili (哔哩哔哩)',
		`bvid: ${info.bvid}`,
		`aid: ${info.aid}`,
		`author: ${info.owner.name}`,
		`author_mid: ${info.owner.mid}`,
		`category: ${info.tname || '-'}`,
		`date: ${formatTimestamp(info.pubdate)}`,
		`duration: ${formatDuration(info.duration)}`,
		`views: ${info.stat.view}`,
		`likes: ${info.stat.like}`,
		`coins: ${info.stat.coin}`,
		`favorites: ${info.stat.favorite}`,
		`danmaku: ${info.stat.danmaku}`,
		`replies: ${info.stat.reply}`,
		`shares: ${info.stat.share}`,
		'---',
		'',
		`# ${info.title}`,
		'',
		`**UP主**: ${info.owner.name} (UID: ${info.owner.mid})`,
		`**发布时间**: ${formatTimestamp(info.pubdate)}`,
		`**时长**: ${formatDuration(info.duration)}`,
		`**分区**: ${info.tname || '-'}`,
		`▶️ ${formatCount(info.stat.view)} | 👍 ${formatCount(
			info.stat.like,
		)} | 🪙 ${formatCount(info.stat.coin)} | ⭐ ${formatCount(
			info.stat.favorite,
		)} | 💬 ${formatCount(info.stat.reply)} | 🔗 ${formatCount(
			info.stat.share,
		)}`,
		'',
	);

	// Description
	if (info.desc) {
		lines.push('## 简介', '', info.desc, '');
	}

	// Cover image
	if (info.pic) {
		let picUrl = info.pic;
		if (picUrl.startsWith('//')) picUrl = `https:${picUrl}`;
		lines.push(`![封面](${picUrl})`, '');
	}

	// Multi-page info
	if (info.pages && info.pages.length > 1) {
		lines.push('## 分P列表', '');
		for (const page of info.pages) {
			lines.push(
				`${page.page}. ${page.part} (${formatDuration(page.duration)})`,
			);
		}

		lines.push('');
	}

	// Subtitles / Transcript
	if (subtitles?.body && subtitles.body.length > 0) {
		lines.push('## 字幕 / 文字稿', '');
		for (const item of subtitles.body) {
			const timeString = formatDuration(Math.floor(item.from));
			lines.push(`[${timeString}] ${item.content}`);
		}

		lines.push('');
	}

	// Comments
	if (comments && comments.length > 0) {
		lines.push('## 热门评论', '');
		for (const comment of comments.slice(0, 20)) {
			const time = formatTimestamp(comment.ctime);
			lines.push(
				`**${comment.member.uname}** (${time}):`,
				`> ${comment.content.message}`,
			);
			if (comment.like > 0) {
				lines.push(`> 👍 ${formatCount(comment.like)}`);
			}

			lines.push('');
		}
	}

	// Source link
	lines.push('---', '', `> 来源: https://www.bilibili.com/video/${info.bvid}`);

	return lines.join('\n');
}

export function biliSubtitleToText(subtitles: BiliSubtitleContent): string {
	if (!subtitles?.body) return '';
	return subtitles.body.map(item => item.content).join('\n');
}
