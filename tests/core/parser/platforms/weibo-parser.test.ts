import {describe, expect, it} from 'vitest';
import {
	weiboCollectImageUrls,
	weiboStatusToMarkdown,
} from '../../../../source/core/parser/platforms/weibo-parser';

const baseStatus = {
	id: 1,
	idstr: '5145xxx',
	mid: '5145xxx',
	mblogid: 'Pxx88kAbC',
	created_at: '2026-05-01T08:00:00+08:00',
	user: {
		id: 1_234_567_890,
		idstr: '1234567890',
		screen_name: 'TestUser',
	},
	text_raw: 'Hello Weibo',
	text: 'Hello Weibo',
	source: '<a>iPhone客户端</a>',
	region_name: '北京',
	reposts_count: 3,
	comments_count: 4,
	attitudes_count: 5,
};

describe('weibo parser', () => {
	it('renders frontmatter and body for a plain status', () => {
		const md = weiboStatusToMarkdown(baseStatus as never);
		expect(md).toContain('platform: 微博');
		expect(md).toContain('mid: 5145xxx');
		expect(md).toContain('author: TestUser');
		expect(md).toContain('# TestUser 的微博');
		expect(md).toContain('## 正文\n\nHello Weibo');
		expect(md).toContain('👍 5 | 💬 4 | 🔁 3');
		expect(md).toContain('> 来源: https://weibo.com/1234567890/Pxx88kAbC');
	});

	it('inlines images from pic_infos with largest URL preference', () => {
		const status = {
			...baseStatus,
			pic_ids: ['picA', 'picB'],
			pic_infos: {
				picA: {
					largest: {url: 'https://wx1.sinaimg.cn/large/picA.jpg'},
					thumbnail: {url: 'https://wx1.sinaimg.cn/thumb/picA.jpg'},
				},
				picB: {
					mw2000: {url: 'https://wx1.sinaimg.cn/mw2000/picB.jpg'},
				},
			},
		};
		const md = weiboStatusToMarkdown(status as never);
		expect(md).toContain('## 图片');
		expect(md).toContain('![图片1](https://wx1.sinaimg.cn/large/picA.jpg)');
		expect(md).toContain('![图片2](https://wx1.sinaimg.cn/mw2000/picB.jpg)');

		expect(weiboCollectImageUrls(status as never)).toEqual([
			'https://wx1.sinaimg.cn/large/picA.jpg',
			'https://wx1.sinaimg.cn/mw2000/picB.jpg',
		]);
	});

	it('substitutes longText body and renders retweet block', () => {
		const status = {
			...baseStatus,
			isLongText: true,
			retweeted_status: {
				...baseStatus,
				idstr: 'orig123',
				mid: 'orig123',
				user: {
					id: 999,
					idstr: '999',
					screen_name: 'OriginalUser',
				},
				text_raw: 'Original status text',
			},
		};
		const md = weiboStatusToMarkdown(status as never, {
			longText: 'Long-form expanded body',
		});
		expect(md).toContain('Long-form expanded body');
		expect(md).toContain('## 转发原文');
		expect(md).toContain('> @OriginalUser：Original status text');
	});

	it('renders comments with reply_comment chains', () => {
		const md = weiboStatusToMarkdown(baseStatus as never, {
			comments: [
				{
					id: 1,
					created_at: '2026-05-01T09:00:00+08:00',
					text: 'first comment',
					text_raw: 'first comment',
					like_counts: 10,
					user: {id: 2, idstr: '2', screen_name: 'CommenterA'},
					reply_comment: {
						id: 0,
						created_at: '',
						text: 'reply target',
						text_raw: 'reply target',
						user: {
							id: 3,
							idstr: '3',
							screen_name: 'OriginalAuthor',
						},
					},
				},
			] as never,
		});
		expect(md).toContain('## 热门评论');
		expect(md).toContain('**CommenterA**');
		expect(md).toContain('> first comment');
		expect(md).toContain('> 👍 10');
		expect(md).toContain('> 回复 @OriginalAuthor: reply target');
	});

	it('falls back to m.weibo.cn URL when uid is missing', () => {
		const md = weiboStatusToMarkdown({
			...baseStatus,
			user: undefined,
		} as never);
		expect(md).toContain('> 来源: https://m.weibo.cn/status/5145xxx');
	});

	it('strips HTML entities and inline tags from text fields', () => {
		const md = weiboStatusToMarkdown({
			...baseStatus,
			text_raw: undefined,
			text: 'A&nbsp;B&amp;C&lt;D&gt;E&quot;F&#39;G<br>second<img alt="ALT" src="x">end',
		} as never);
		expect(md).toContain('A B&C<D>E"F\'G');
		expect(md).toContain('second');
		expect(md).toContain('ALTend');
	});

	it('renders video block when page_info.media_info is present', () => {
		const md = weiboStatusToMarkdown({
			...baseStatus,
			page_info: {
				type: 'video',
				media_info: {
					mp4_hd_url: 'https://video.weibo.com/hd.mp4',
					duration: 42,
				},
			},
		} as never);
		expect(md).toContain('## 视频');
		expect(md).toContain('https://video.weibo.com/hd.mp4');
		expect(md).toContain('时长: 42 秒');
	});

	it('renders retweet image gallery via blockquote', () => {
		const md = weiboStatusToMarkdown({
			...baseStatus,
			retweeted_status: {
				...baseStatus,
				idstr: 'rt-1',
				mid: 'rt-1',
				pic_ids: ['rtA'],
				pic_infos: {
					rtA: {large: {url: 'https://wx2.sinaimg.cn/large/rtA.jpg'}},
				},
				user: {id: 9, idstr: '9', screen_name: 'OrigAuthor'},
				text_raw: 'orig text',
			},
		} as never);
		expect(md).toContain('## 转发原文');
		expect(md).toContain('> @OrigAuthor：orig text');
		expect(md).toContain('> ![原图1](https://wx2.sinaimg.cn/large/rtA.jpg)');
	});

	it('falls back to wx{n}.sinaimg.cn for raw pic_ids without pic_infos', () => {
		const md = weiboStatusToMarkdown({
			...baseStatus,
			pic_ids: ['raw1', 'raw2'],
			pic_infos: undefined,
		} as never);
		expect(md).toContain('![图片1](https://wx1.sinaimg.cn/large/raw1.jpg)');
		expect(md).toContain('![图片2](https://wx1.sinaimg.cn/large/raw2.jpg)');
	});

	it('honors maxComments to cap rendered comments', () => {
		const make = (i: number) => ({
			id: i,
			created_at: '',
			text: `c${i}`,
			text_raw: `c${i}`,
			user: {id: i, idstr: String(i), screen_name: `U${i}`},
		});
		const md = weiboStatusToMarkdown(baseStatus as never, {
			maxComments: 2,
			comments: [make(1), make(2), make(3)] as never,
		});
		expect(md).toContain('**U1**');
		expect(md).toContain('**U2**');
		expect(md).not.toContain('**U3**');
	});

	it('falls back to 已删除用户 when retweet user is missing', () => {
		const md = weiboStatusToMarkdown({
			...baseStatus,
			retweeted_status: {
				...baseStatus,
				user: undefined,
				text: undefined,
				text_raw: undefined,
			},
		} as never);
		expect(md).toContain('## 转发原文');
		expect(md).toContain('> @已删除用户');
	});

	it('renders comments without like_counts and without reply_comment fields', () => {
		const md = weiboStatusToMarkdown(baseStatus as never, {
			comments: [
				{
					id: 1,
					created_at: '',
					text: 'plain comment',
					text_raw: undefined,
					user: undefined,
				},
			] as never,
		});
		expect(md).toContain('**匿名**');
		expect(md).toContain('> plain comment');
		expect(md).not.toContain('> 👍');
		expect(md).not.toContain('> 回复 @');
	});

	it('renders reply_comment with anonymous user fallback', () => {
		const md = weiboStatusToMarkdown(baseStatus as never, {
			comments: [
				{
					id: 1,
					created_at: '',
					text: 'rep parent',
					text_raw: 'rep parent',
					user: {id: 2, idstr: '2', screen_name: 'A'},
					reply_comment: {
						id: 0,
						created_at: '',
						text: 'orig',
						text_raw: undefined,
						user: undefined,
					},
				},
			] as never,
		});
		expect(md).toContain('> 回复 @匿名: orig');
	});

	it('handles reply_comment with both text_raw and text missing', () => {
		const md = weiboStatusToMarkdown(baseStatus as never, {
			comments: [
				{
					id: 1,
					created_at: '',
					text: 'parent comment',
					text_raw: 'parent comment',
					user: {id: 2, idstr: '2', screen_name: 'A'},
					reply_comment: {
						id: 0,
						created_at: '',
						text: undefined,
						text_raw: undefined,
						user: {id: 3, idstr: '3', screen_name: 'B'},
					},
				},
			] as never,
		});
		expect(md).toContain('> 回复 @B:');
	});

	it('uses idstr in source URL when mblogid is absent', () => {
		const md = weiboStatusToMarkdown({
			...baseStatus,
			mblogid: undefined,
		} as never);
		expect(md).toContain('> 来源: https://weibo.com/1234567890/5145xxx');
	});

	it('weiboCollectImageUrls includes retweet images', () => {
		const status = {
			...baseStatus,
			pic_ids: ['main'],
			pic_infos: {main: {largest: {url: 'https://wx1.sinaimg.cn/main.jpg'}}},
			retweeted_status: {
				...baseStatus,
				pic_ids: ['rt'],
				pic_infos: {rt: {largest: {url: 'https://wx1.sinaimg.cn/rt.jpg'}}},
			},
		};
		expect(weiboCollectImageUrls(status as never)).toEqual([
			'https://wx1.sinaimg.cn/main.jpg',
			'https://wx1.sinaimg.cn/rt.jpg',
		]);
	});
});
