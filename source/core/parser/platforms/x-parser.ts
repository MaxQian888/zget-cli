import type {XTweet, XUser} from '../../api/x-types';

function formatDate(isoDate?: string): string {
	if (!isoDate) return '';
	const d = new Date(isoDate);
	return d.toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function tweetToMarkdown(tweet: XTweet, author?: XUser): string {
	const lines: string[] = [];

	lines.push('---', `platform: X (Twitter)`, `tweet_id: ${tweet.id}`);
	if (author) {
		lines.push(`author: ${author.name} (@${author.username})`);
	}

	if (tweet.created_at) {
		lines.push(`date: ${formatDate(tweet.created_at)}`);
	}

	if (tweet.public_metrics) {
		const m = tweet.public_metrics;
		lines.push(
			`likes: ${m.like_count}`,
			`retweets: ${m.retweet_count}`,
			`replies: ${m.reply_count}`,
			`quotes: ${m.quote_count}`,
		);
	}

	lines.push('---', '');

	// Author heading
	if (author) {
		lines.push(`# ${author.name} (@${author.username})`, '');
	}

	// Tweet content
	lines.push(tweet.text, '');

	// Referenced tweets
	if (tweet.referenced_tweets?.length) {
		for (const ref of tweet.referenced_tweets) {
			lines.push(
				`> ${
					ref.type === 'retweeted'
						? '转推'
						: ref.type === 'quoted'
						? '引用'
						: '回复'
				}: https://x.com/i/status/${ref.id}`,
			);
		}

		lines.push('');
	}

	// Metrics footer
	if (tweet.public_metrics) {
		const m = tweet.public_metrics;
		lines.push(
			'---',
			'',
			`❤️ ${m.like_count} | 🔁 ${m.retweet_count} | 💬 ${m.reply_count} | 📎 ${m.quote_count}`,
			'',
		);
	}

	lines.push(`> 来源: https://x.com/i/status/${tweet.id}`);

	return lines.join('\n');
}

export function userProfileToMarkdown(user: XUser): string {
	const lines: string[] = [];

	lines.push(
		'---',
		`platform: X (Twitter)`,
		`user_id: ${user.id}`,
		`username: @${user.username}`,
		'---',
		'',
		`# ${user.name} (@${user.username})`,
		'',
	);

	if (user.description) {
		lines.push(user.description, '');
	}

	if (user.location) {
		lines.push(`📍 ${user.location}`);
	}

	if (user.url) {
		lines.push(`🔗 ${user.url}`);
	}

	if (user.created_at) {
		lines.push(`📅 ${formatDate(user.created_at)}`);
	}

	lines.push('');

	if (user.public_metrics) {
		const m = user.public_metrics;
		lines.push(
			`| 推文 | 关注 | 粉丝 | 列表 |`,
			`|------|------|------|------|`,
			`| ${m.tweet_count} | ${m.following_count} | ${m.followers_count} | ${m.listed_count} |`,
		);
	}

	return lines.join('\n');
}
