import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {
	loadMock,
	parseCookieStringMock,
	getVideoInfoMock,
	getSubtitlesMock,
	getCommentsMock,
} = vi.hoisted(() => ({
	loadMock: vi.fn(),
	parseCookieStringMock: vi.fn(),
	getVideoInfoMock: vi.fn(),
	getSubtitlesMock: vi.fn(),
	getCommentsMock: vi.fn(),
}));

vi.mock('../../../source/core/auth/bili-auth', () => ({
	BiliCookieStore: class {
		load = loadMock;
		parseCookieString = parseCookieStringMock;
	},
}));

vi.mock('../../../source/core/api/bili-api', () => ({
	BiliApi: class {
		getVideoInfo = getVideoInfoMock;
		getSubtitles = getSubtitlesMock;
		getComments = getCommentsMock;
	},
}));

import {extractContentForSummary} from '../../../source/core/ai/content-extractor';

describe('extractContentForSummary', () => {
	beforeEach(() => {
		loadMock.mockReset();
		parseCookieStringMock.mockReset();
		getVideoInfoMock.mockReset();
		getSubtitlesMock.mockReset();
		getCommentsMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('uses Bilibili subtitles when available', async () => {
		getVideoInfoMock.mockResolvedValue({title: 'Bili title', desc: '视频简介'});
		getSubtitlesMock.mockResolvedValue({
			body: [{content: '字幕第一句'}, {content: '字幕第二句'}],
		});

		await expect(
			extractContentForSummary('https://www.bilibili.com/video/BV1xx411c7mD', {
				cookies: 'SESSDATA=session',
			} as never),
		).resolves.toEqual({
			text: '字幕第一句\n字幕第二句',
			title: 'Bili title',
			platform: 'Bilibili',
			contentType: 'video-subtitle',
		});
		expect(parseCookieStringMock).toHaveBeenCalledWith('SESSDATA=session');
	});

	it('rejects Bilibili urls that do not resolve to a video id', async () => {
		await expect(
			extractContentForSummary('https://space.bilibili.com/2233', {} as never),
		).rejects.toThrow('无法解析 Bilibili 视频 ID');
	});

	it('falls back to description and comments when subtitles are unavailable', async () => {
		getVideoInfoMock.mockResolvedValue({title: 'Bili title', desc: '视频简介'});
		getSubtitlesMock.mockRejectedValue(new Error('no subtitles'));
		getCommentsMock.mockResolvedValue([
			{member: {uname: '评论甲'}, content: {message: '很好看'}},
		]);

		const result = await extractContentForSummary(
			'https://www.bilibili.com/video/BV1xx411c7mD',
			{} as never,
		);

		expect(result).toEqual({
			text: '视频简介\n\n评论:\n\n评论甲: 很好看',
			title: 'Bili title',
			platform: 'Bilibili',
			contentType: 'article',
		});
	});

	it('extracts zhihu article content from fetched html', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => `
					<h1 class="Post-Title">知乎标题</h1>
					<div class="Post-RichTextContainer">知乎正文</div>
				`,
			}),
		);

		await expect(
			extractContentForSummary(
				'https://zhuanlan.zhihu.com/p/10086',
				{} as never,
			),
		).resolves.toEqual({
			text: '知乎正文',
			title: '知乎标题',
			platform: '知乎',
			contentType: 'article',
		});
	});

	it('throws when the Zhihu page request fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
			}),
		);

		await expect(
			extractContentForSummary(
				'https://zhuanlan.zhihu.com/p/10086',
				{} as never,
			),
		).rejects.toThrow('获取知乎内容失败: 403');
	});

	it('extracts article content for supported article platforms', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => `
					<h1>CSDN 标题</h1>
					<div id="article_content">段落一</div>
				`,
			}),
		);

		await expect(
			extractContentForSummary(
				'https://blog.csdn.net/demo/article/details/123',
				{} as never,
			),
		).resolves.toEqual({
			text: '段落一',
			title: 'CSDN 标题',
			platform: 'CSDN',
			contentType: 'article',
		});
	});

	it('uses generic extraction for social pages and trims whitespace', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => `
					<title>X 帖子</title>
					<main>
						Hello

						world
					</main>
				`,
			}),
		);

		await expect(
			extractContentForSummary('https://x.com/openai/status/123', {} as never),
		).resolves.toEqual({
			text: 'Hello world',
			title: 'X 帖子',
			platform: 'X (Twitter)',
			contentType: 'social-post',
		});
	});

	it('falls back to the default generic extractor for unknown urls', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => `
					<title>Generic page</title>
					<body>   Generic   content   </body>
				`,
			}),
		);

		await expect(
			extractContentForSummary('https://example.com/post/1', {} as never),
		).resolves.toEqual({
			text: 'Generic content',
			title: 'Generic page',
			platform: '网页',
			contentType: 'article',
		});
	});

	it('throws when article extraction returns no content', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => '<h1>Empty</h1>',
			}),
		);

		await expect(
			extractContentForSummary(
				'https://blog.csdn.net/demo/article/details/123',
				{} as never,
			),
		).rejects.toThrow('无法提取文章内容');
	});
});
