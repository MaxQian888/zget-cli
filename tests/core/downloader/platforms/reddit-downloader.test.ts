import {beforeEach, describe, expect, it, vi} from 'vitest';

const {writeFileMock, mkdirMock} = vi.hoisted(() => ({
	writeFileMock: vi.fn(),
	mkdirMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	writeFile: writeFileMock,
	mkdir: mkdirMock,
	readFile: vi.fn(),
}));

vi.mock('../../../../source/core/downloader/image-downloader', () => ({
	downloadImages: vi.fn().mockResolvedValue({downloaded: 0, failed: 0}),
}));

import {downloadRedditPost} from '../../../../source/core/downloader/platforms/reddit-downloader';

describe('downloadRedditPost', () => {
	beforeEach(() => {
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('writes a markdown file under <outputDir>/reddit/<sub>/<dir>/', async () => {
		const api = {
			getPost: vi.fn().mockResolvedValue({
				id: 'abc',
				subreddit: 'programming',
				title: 'Hello',
				author: 'pg',
				permalink: '/r/programming/comments/abc/hello/',
				score: 1,
				num_comments: 0,
				created_utc: 0,
			}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadRedditPost('abc', api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.outputPath).toContain('reddit');
		expect(result.outputPath).toContain('programming');
		expect(writeFileMock).toHaveBeenCalledTimes(1);
	});

	it('reports failure when the post fetch throws', async () => {
		const api = {
			getPost: vi.fn().mockRejectedValue(new Error('boom')),
			getComments: vi.fn(),
		};

		const result = await downloadRedditPost('xyz', api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});
		expect(result.success).toBe(false);
		expect(result.error).toBe('boom');
	});

	it('downloads images when --images is set and the post has a preview', async () => {
		const api = {
			getPost: vi.fn().mockResolvedValue({
				id: '1',
				subreddit: 's',
				title: 't',
				author: 'a',
				permalink: '/p',
				score: 0,
				num_comments: 0,
				created_utc: 0,
				preview: {images: [{source: {url: 'https://i.r/x.jpg'}}]},
			}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadRedditPost('1', api as never, {
			outputDir: 'D:/out',
			downloadImages: true,
			verbose: false,
		});
		expect(result.success).toBe(true);
	});

	it('emits progress events through the lifecycle', async () => {
		const phases: string[] = [];
		const api = {
			getPost: vi.fn().mockResolvedValue({
				id: '1',
				subreddit: 's',
				title: 't',
				author: 'a',
				permalink: '/p',
				score: 0,
				num_comments: 0,
				created_utc: 0,
			}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		await downloadRedditPost('1', api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
			onProgress(p) {
				phases.push(p.phase);
			},
		});

		expect(phases).toEqual(
			expect.arrayContaining(['fetching', 'parsing', 'writing', 'done']),
		);
	});

	it('swallows getComments errors and still writes markdown', async () => {
		const api = {
			getPost: vi.fn().mockResolvedValue({
				id: 'ok',
				subreddit: 'p',
				title: 'still ok',
				author: 'me',
				permalink: '/p',
				score: 0,
				num_comments: 0,
				created_utc: 0,
			}),
			getComments: vi.fn().mockRejectedValue(new Error('comments down')),
		};

		const result = await downloadRedditPost('ok', api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(writeFileMock).toHaveBeenCalledTimes(1);
	});

	it('uses reddit_<id> dir name and post.id filename when title strips to empty', async () => {
		const api = {
			getPost: vi.fn().mockResolvedValue({
				id: 'zz',
				subreddit: 'p',
				title: '<b>   </b>',
				author: 'me',
				permalink: '/p',
				score: 0,
				num_comments: 0,
				created_utc: 0,
			}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadRedditPost('zz', api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.outputPath).toContain('reddit_zz');
		expect(result.outputPath).toContain('zz_u-me');
	});

	it('skips image phase when downloadImages is true but post has no preview', async () => {
		const phases: string[] = [];
		const api = {
			getPost: vi.fn().mockResolvedValue({
				id: '2',
				subreddit: 's',
				title: 't',
				author: 'a',
				permalink: '/p',
				score: 0,
				num_comments: 0,
				created_utc: 0,
			}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadRedditPost('2', api as never, {
			outputDir: 'D:/out',
			downloadImages: true,
			verbose: false,
			onProgress(p) {
				phases.push(p.phase);
			},
		});

		expect(result.success).toBe(true);
		expect(result.imageCount).toBe(0);
		expect(phases).not.toContain('images');
	});
});
