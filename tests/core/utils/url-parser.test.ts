import {describe, expect, it} from 'vitest';
import {
	buildAnswerUrl,
	buildArticleUrl,
	buildBiliUserUrl,
	buildBiliVideoUrl,
	buildColumnUrl,
	buildUserUrl,
	buildVideoUrl,
	getPlatformName,
	parseUrl,
	parseZhihuUrl,
} from '../../../source/core/utils/url-parser';

describe('parseUrl', () => {
	it('parses supported platform URLs', () => {
		expect(parseUrl('https://www.zhihu.com/column/weekly')).toEqual({
			platform: 'zhihu',
			type: 'column',
			columnId: 'weekly',
		});
		expect(
			parseUrl('https://www.zhihu.com/question/1/answer/2?utm_source=test'),
		).toEqual({
			platform: 'zhihu',
			type: 'answer',
			questionId: '1',
			answerId: '2',
		});
		expect(parseUrl('https://www.zhihu.com/zvideo/42')).toEqual({
			platform: 'zhihu',
			type: 'video',
			videoId: '42',
		});
		expect(parseUrl('https://www.zhihu.com/people/astro-air')).toEqual({
			platform: 'zhihu',
			type: 'user',
			userId: 'astro-air',
		});
		expect(parseUrl('https://zhuanlan.zhihu.com/p/10086')).toEqual({
			platform: 'zhihu',
			type: 'article',
			articleId: '10086',
		});
		expect(parseUrl('https://blog.csdn.net/demo/category_123.html')).toEqual({
			platform: 'csdn',
			type: 'category',
			url: 'https://blog.csdn.net/demo/category_123.html',
		});
		expect(
			parseUrl('https://blog.csdn.net/demo/article/details/123456'),
		).toEqual({
			platform: 'csdn',
			type: 'article',
			url: 'https://blog.csdn.net/demo/article/details/123456',
		});
		expect(
			parseUrl('https://mp.weixin.qq.com/s?__biz=1&mid=2&idx=1&sn=3'),
		).toEqual({
			platform: 'weixin',
			type: 'article',
			url: 'https://mp.weixin.qq.com/s?__biz=1&mid=2&idx=1&sn=3',
		});
		expect(parseUrl('https://juejin.cn/post/735799318218')).toEqual({
			platform: 'juejin',
			type: 'article',
			url: 'https://juejin.cn/post/735799318218',
		});
		expect(parseUrl('https://x.com/codex/status/1234567890')).toEqual({
			platform: 'x',
			type: 'tweet',
			username: 'codex',
			tweetId: '1234567890',
		});
		expect(parseUrl('https://twitter.com/openai')).toEqual({
			platform: 'x',
			type: 'user',
			username: 'openai',
		});
		expect(
			parseUrl('https://www.xiaohongshu.com/explore/64fa88aabbccdd0011223344'),
		).toEqual({
			platform: 'xhs',
			type: 'note',
			noteId: '64fa88aabbccdd0011223344',
		});
		expect(
			parseUrl(
				'https://www.xiaohongshu.com/user/profile/64fa88aabbccdd0011223344',
			),
		).toEqual({
			platform: 'xhs',
			type: 'user',
			userId: '64fa88aabbccdd0011223344',
		});
		expect(parseUrl('https://xhslink.com/abc123')).toEqual({
			platform: 'xhs',
			type: 'note',
			noteId: 'abc123',
		});
		expect(parseUrl(' https://www.bilibili.com/video/BV1xx411c7mD ')).toEqual({
			platform: 'bili',
			type: 'video',
			bvid: 'BV1xx411c7mD',
		});
		expect(parseUrl('https://space.bilibili.com/2233')).toEqual({
			platform: 'bili',
			type: 'user',
			mid: '2233',
		});
	});

	it('falls back to unknown for unsupported inputs', () => {
		expect(parseUrl('https://example.com/post/1')).toEqual({
			platform: 'unknown',
			type: 'unknown',
			raw: 'https://example.com/post/1',
		});
		expect(parseZhihuUrl('not a url')).toEqual({
			platform: 'unknown',
			type: 'unknown',
			raw: 'not a url',
		});
	});
});

describe('url helpers', () => {
	it('builds canonical platform URLs', () => {
		expect(buildArticleUrl('123')).toBe('https://zhuanlan.zhihu.com/p/123');
		expect(buildAnswerUrl('11', '22')).toBe(
			'https://www.zhihu.com/question/11/answer/22',
		);
		expect(buildVideoUrl('33')).toBe('https://www.zhihu.com/zvideo/33');
		expect(buildColumnUrl('daily')).toBe('https://www.zhihu.com/column/daily');
		expect(buildUserUrl('alice')).toBe('https://www.zhihu.com/people/alice');
		expect(buildBiliVideoUrl('BV1ab411c7mD')).toBe(
			'https://www.bilibili.com/video/BV1ab411c7mD',
		);
		expect(buildBiliUserUrl('12345')).toBe('https://space.bilibili.com/12345');
	});

	it('returns localized platform names', () => {
		expect(getPlatformName('zhihu')).toBe('知乎');
		expect(getPlatformName('x')).toBe('X (Twitter)');
		expect(getPlatformName('bili')).toBe('Bilibili (哔哩哔哩)');
		expect(getPlatformName('unknown')).toBe('未知');
	});
});
