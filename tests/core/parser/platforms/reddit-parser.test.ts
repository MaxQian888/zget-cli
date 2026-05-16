import {describe, expect, it} from 'vitest';
import {
	redditCollectImageUrls,
	redditPostToMarkdown,
} from '../../../../source/core/parser/platforms/reddit-parser';
import type {RedditComment, RedditPost} from '../../../../source/types/reddit';

describe('reddit-parser', () => {
	it('renders post metadata + selftext', () => {
		const post: RedditPost = {
			id: 'abc',
			subreddit: 'programming',
			title: 'Hello',
			author: 'pg',
			permalink: '/r/programming/comments/abc/hello/',
			score: 100,
			num_comments: 5,
			created_utc: 1_700_000_000,
			selftext: 'Body here',
		};
		const out = redditPostToMarkdown(post);
		expect(out).toContain('# Hello');
		expect(out).toContain('- Subreddit: r/programming');
		expect(out).toContain('- 作者: u/pg');
		expect(out).toContain('- Score: 100');
		expect(out).toContain('Body here');
	});

	it('falls back to external URL when no body is present', () => {
		const post: RedditPost = {
			id: '1',
			subreddit: 's',
			title: 't',
			author: 'a',
			permalink: '/p',
			score: 0,
			num_comments: 0,
			created_utc: 0,
			url: 'https://example.com',
		};
		const out = redditPostToMarkdown(post);
		expect(out).toContain('外链文章: <https://example.com>');
	});

	it('renders comments with depth-based quote indentation', () => {
		const post: RedditPost = {
			id: '1',
			subreddit: 's',
			title: 't',
			author: 'a',
			permalink: '/p',
			score: 0,
			num_comments: 0,
			created_utc: 0,
		};
		const comments: RedditComment[] = [
			{id: 'c1', author: 'a', body: 'top', score: 1, created_utc: 0, depth: 0},
			{
				id: 'c2',
				author: 'b',
				body: 'nested',
				score: 0,
				created_utc: 0,
				depth: 1,
			},
		];
		const out = redditPostToMarkdown(post, comments);
		expect(out).toContain('## 评论树');
		expect(out).toContain('**u/a**');
		const nestedLine = out.split('\n').find(l => l.includes('nested'));
		expect(nestedLine?.startsWith('> > ')).toBe(true);
	});

	it('renders selftext_html via turndown when present', () => {
		const post: RedditPost = {
			id: '1',
			subreddit: 's',
			title: 't',
			author: 'a',
			permalink: '/p',
			score: 0,
			num_comments: 0,
			created_utc: 0,
			selftext_html: '&lt;p&gt;hello &lt;b&gt;world&lt;/b&gt;&lt;/p&gt;',
		};
		const out = redditPostToMarkdown(post);
		expect(out).toContain('hello');
		expect(out).toContain('**world**');
	});

	it('redditCollectImageUrls extracts preview source URLs', () => {
		const post: RedditPost = {
			id: '1',
			subreddit: 's',
			title: 't',
			author: 'a',
			permalink: '/p',
			score: 0,
			num_comments: 0,
			created_utc: 0,
			preview: {
				images: [
					{source: {url: 'https://i.redd.it/x.jpg?width=1'}},
					{source: {url: 'https://i.redd.it/y.png'}},
				],
			},
		};
		const urls = redditCollectImageUrls(post);
		expect(urls).toHaveLength(2);
		expect(urls[0]).toBe('https://i.redd.it/x.jpg?width=1');
	});

	it('redditCollectImageUrls picks up direct image URLs', () => {
		const post: RedditPost = {
			id: '1',
			subreddit: 's',
			title: 't',
			author: 'a',
			permalink: '/p',
			score: 0,
			num_comments: 0,
			created_utc: 0,
			url: 'https://i.imgur.com/abc.png',
		};
		const urls = redditCollectImageUrls(post);
		expect(urls).toContain('https://i.imgur.com/abc.png');
	});
});
