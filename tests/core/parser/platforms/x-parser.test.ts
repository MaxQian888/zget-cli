import {describe, expect, it} from 'vitest';
import {
	tweetToMarkdown,
	userProfileToMarkdown,
} from '../../../../source/core/parser/platforms/x-parser';

describe('x parser', () => {
	it('renders tweet markdown with author info, metrics, and referenced tweets', () => {
		const markdown = tweetToMarkdown(
			{
				id: '123',
				text: 'Hello from X',
				created_at: '2026-04-01T00:00:00Z',
				public_metrics: {
					like_count: 10,
					retweet_count: 2,
					reply_count: 3,
					quote_count: 1,
				},
				referenced_tweets: [
					{id: '99', type: 'quoted'},
					{id: '88', type: 'replied_to'},
				],
			} as never,
			{
				id: 'u1',
				name: 'Astro Air',
				username: 'astroair',
			} as never,
		);

		expect(markdown).toContain('platform: X (Twitter)');
		expect(markdown).toContain('# Astro Air (@astroair)');
		expect(markdown).toContain('Hello from X');
		expect(markdown).toContain('引用: https://x.com/i/status/99');
		expect(markdown).toContain('回复: https://x.com/i/status/88');
		expect(markdown).toContain('> 来源: https://x.com/i/status/123');
	});

	it('renders user profiles with optional description, links, and metrics', () => {
		const markdown = userProfileToMarkdown({
			id: 'u1',
			name: 'Astro Air',
			username: 'astroair',
			description: 'Builder',
			location: 'Shanghai',
			url: 'https://openai.com',
			created_at: '2026-04-01T00:00:00Z',
			public_metrics: {
				tweet_count: 10,
				following_count: 20,
				followers_count: 30,
				listed_count: 2,
			},
		} as never);

		expect(markdown).toContain('# Astro Air (@astroair)');
		expect(markdown).toContain('Builder');
		expect(markdown).toContain('📍 Shanghai');
		expect(markdown).toContain('🔗 https://openai.com');
		expect(markdown).toContain('| 10 | 20 | 30 | 2 |');
	});

	it('supports tweets and profiles without optional metadata', () => {
		const tweetMarkdown = tweetToMarkdown({
			id: '456',
			text: 'Minimal tweet',
			referenced_tweets: [{id: '1', type: 'retweeted'}],
		} as never);
		const profileMarkdown = userProfileToMarkdown({
			id: 'u2',
			name: 'Minimal User',
			username: 'minimal',
		} as never);

		expect(tweetMarkdown).toContain('转推: https://x.com/i/status/1');
		expect(tweetMarkdown).toContain('> 来源: https://x.com/i/status/456');
		expect(profileMarkdown).toContain('# Minimal User (@minimal)');
		expect(profileMarkdown).not.toContain('📍');
		expect(profileMarkdown).not.toContain('| 推文 |');
	});
});
