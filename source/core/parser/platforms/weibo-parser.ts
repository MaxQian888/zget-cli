import type {
	WeiboCommentEntry,
	WeiboPicInfo,
	WeiboStatus,
} from '../../../types/weibo';

function formatTimestamp(value: string | number): string {
	if (!value) return '';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return String(value);
	return d.toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function stripTags(html: string): string {
	if (!html) return '';
	return html
		.replaceAll(/<br\s*\/?>/gi, '\n')
		.replaceAll(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '$1')
		.replaceAll(/<[^>]+>/g, '')
		.replaceAll('&nbsp;', ' ')
		.replaceAll('&amp;', '&')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'")
		.trim();
}

function bestPicUrl(info: WeiboPicInfo): string | undefined {
	const candidate =
		info.largest?.url ??
		info.mw2000?.url ??
		info.original?.url ??
		info.large?.url ??
		info.bmiddle?.url ??
		info.thumbnail?.url;
	if (!candidate) return undefined;
	return candidate.startsWith('//') ? `https:${candidate}` : candidate;
}

function collectImageUrls(status: WeiboStatus): string[] {
	const urls: string[] = [];
	if (status.pic_infos) {
		const order =
			status.pic_ids && status.pic_ids.length > 0
				? status.pic_ids
				: Object.keys(status.pic_infos);
		for (const id of order) {
			const info = status.pic_infos[id];
			if (!info) continue;
			const url = bestPicUrl(info);
			if (url) urls.push(url);
		}
	} else if (status.pic_ids?.length) {
		for (const id of status.pic_ids) {
			urls.push(`https://wx1.sinaimg.cn/large/${id}.jpg`);
		}
	}

	return urls;
}

function bestVideoUrl(status: WeiboStatus): string | undefined {
	const media = status.page_info?.media_info;
	if (!media) return undefined;
	return (
		media.mp4_hd_url ??
		media.mp4_sd_url ??
		media.stream_url_hd ??
		media.stream_url
	);
}

export type WeiboParserOptions = {
	longText?: string;
	comments?: WeiboCommentEntry[];
	maxComments?: number;
};

export function weiboStatusToMarkdown(
	status: WeiboStatus,
	options: WeiboParserOptions = {},
): string {
	const longText = options.longText;
	const comments = options.comments ?? [];
	const maxComments = options.maxComments ?? 30;

	const lines: string[] = [];
	const author = status.user?.screen_name ?? '匿名';
	const authorId = status.user?.idstr ?? String(status.user?.id ?? '');
	const text = longText ?? status.text_raw ?? stripTags(status.text ?? '');
	const created = formatTimestamp(status.created_at);
	const source = stripTags(status.source ?? '');

	lines.push(
		'---',
		'platform: 微博',
		`mid: ${status.mid}`,
		`idstr: ${status.idstr}`,
		`author: ${author}`,
		`author_uid: ${authorId}`,
		`date: ${created}`,
		`source: ${source || '-'}`,
		`region: ${status.region_name ?? '-'}`,
		`reposts: ${status.reposts_count ?? 0}`,
		`comments: ${status.comments_count ?? 0}`,
		`attitudes: ${status.attitudes_count ?? 0}`,
		'---',
		'',
		`# ${author} 的微博`,
		'',
		`**作者**: ${author}（UID: ${authorId || '-'})`,
		`**发布时间**: ${created}`,
	);

	if (source) lines.push(`**来源**: ${source}`);
	if (status.region_name) lines.push(`**位置**: ${status.region_name}`);

	lines.push(
		`👍 ${status.attitudes_count ?? 0} | 💬 ${
			status.comments_count ?? 0
		} | 🔁 ${status.reposts_count ?? 0}`,
		'',
	);

	if (text) {
		lines.push('## 正文', '', text, '');
	}

	const imageUrls = collectImageUrls(status);
	if (imageUrls.length > 0) {
		lines.push('## 图片', '');
		for (const [index, url] of imageUrls.entries()) {
			lines.push(`![图片${index + 1}](${url})`);
		}

		lines.push('');
	}

	const videoUrl = bestVideoUrl(status);
	if (videoUrl) {
		lines.push(
			'## 视频',
			'',
			`[点击查看视频](${videoUrl})`,
			`时长: ${status.page_info?.media_info?.duration ?? 0} 秒`,
			'',
		);
	}

	if (status.retweeted_status) {
		const retweet = status.retweeted_status;
		const rtAuthor = retweet.user?.screen_name ?? '已删除用户';
		const rtText = retweet.text_raw ?? stripTags(retweet.text ?? '');
		lines.push('## 转发原文', '', `> @${rtAuthor}：${rtText}`);

		const rtImages = collectImageUrls(retweet);
		if (rtImages.length > 0) {
			lines.push('');
			for (const [index, url] of rtImages.entries()) {
				lines.push(`> ![原图${index + 1}](${url})`);
			}
		}

		lines.push('');
	}

	if (comments.length > 0) {
		lines.push('## 热门评论', '');
		for (const c of comments.slice(0, maxComments)) {
			const cAuthor = c.user?.screen_name ?? '匿名';
			const cText = c.text_raw ?? stripTags(c.text ?? '');
			const cTime = formatTimestamp(c.created_at);
			lines.push(`**${cAuthor}** (${cTime}):`, `> ${cText}`);
			if ((c.like_counts ?? 0) > 0) {
				lines.push(`> 👍 ${c.like_counts}`);
			}

			if (c.reply_comment) {
				const rAuthor = c.reply_comment.user?.screen_name ?? '匿名';
				const rText =
					c.reply_comment.text_raw ?? stripTags(c.reply_comment.text ?? '');
				lines.push(`> 回复 @${rAuthor}: ${rText}`);
			}

			lines.push('');
		}
	}

	const sourceUrl =
		authorId && (status.mblogid ?? status.idstr)
			? `https://weibo.com/${authorId}/${status.mblogid ?? status.idstr}`
			: `https://m.weibo.cn/status/${status.idstr}`;
	lines.push('---', '', `> 来源: ${sourceUrl}`);

	return lines.join('\n');
}

export function weiboCollectImageUrls(status: WeiboStatus): string[] {
	const urls = collectImageUrls(status);
	if (status.retweeted_status) {
		urls.push(...collectImageUrls(status.retweeted_status));
	}

	return urls;
}
