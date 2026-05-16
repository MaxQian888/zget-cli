import TurndownService from 'turndown';
import type {RedditComment, RedditPost} from '../../../types/reddit';

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

function decodeHtmlEntities(value: string): string {
	return value
		.replaceAll('&amp;', '&')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'")
		.replaceAll('&apos;', "'");
}

export function redditPostToMarkdown(
	post: RedditPost,
	comments: RedditComment[] = [],
): string {
	const lines: string[] = [
		`# ${post.title}`,
		'',
		'## 元数据',
		'',
		`- ID: \`${post.id}\``,
		`- Subreddit: r/${post.subreddit}`,
		`- 作者: u/${post.author}`,
		`- Permalink: https://www.reddit.com${post.permalink}`,
	];
	if (post.url) lines.push(`- 链接: <${post.url}>`);
	if (post.created_utc) {
		lines.push(`- 发布时间: ${formatTimestamp(post.created_utc)}`);
	}

	lines.push(
		`- Score: ${post.score}`,
		`- 评论数: ${post.num_comments}`,
		'',
		'## 正文',
		'',
	);
	if (post.selftext_html) {
		lines.push(htmlToMarkdown(decodeHtmlEntities(post.selftext_html)));
	} else if (post.selftext) {
		lines.push(post.selftext);
	} else if (post.url) {
		lines.push(`> 外链文章: <${post.url}>`);
	} else {
		lines.push('> (无正文)');
	}

	if (comments.length > 0) {
		lines.push('', '## 评论树', '');
		for (const c of comments) {
			const depth = c.depth ?? 0;
			const prefix = '> '.repeat(depth + 1);
			lines.push(`${prefix}**u/${c.author}** · score ${c.score}`);
			const text = c.body_html
				? htmlToMarkdown(decodeHtmlEntities(c.body_html))
				: c.body ?? '';
			for (const line of text.split('\n')) {
				lines.push(`${prefix}${line}`);
			}

			lines.push(prefix.trimEnd());
		}
	}

	return lines.join('\n');
}

export function redditCollectImageUrls(post: RedditPost): string[] {
	const urls: string[] = [];
	const preview = post.preview?.images;
	if (preview) {
		for (const image of preview) {
			if (image.source?.url) {
				urls.push(decodeHtmlEntities(image.source.url));
			}
		}
	}

	if (post.url && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(post.url)) {
		urls.push(post.url);
	}

	return urls;
}
