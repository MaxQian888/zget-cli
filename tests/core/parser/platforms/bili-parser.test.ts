import {describe, expect, it} from 'vitest';
import {
	biliSubtitleToText,
	biliVideoToMarkdown,
} from '../../../../source/core/parser/platforms/bili-parser';

describe('bili parser', () => {
	it('renders video markdown with subtitles, comments, and normalized cover urls', () => {
		const markdown = biliVideoToMarkdown(
			{
				bvid: 'BV1xx411c7mD',
				aid: 100,
				title: 'Bilibili 视频',
				desc: '视频简介',
				pic: '//image.example.com/cover.jpg',
				pubdate: 1_711_929_600,
				duration: 65,
				tname: '知识',
				owner: {name: 'UP 主', mid: 42},
				stat: {
					view: 12_345,
					like: 456,
					coin: 78,
					favorite: 90,
					danmaku: 12,
					reply: 34,
					share: 5,
				},
				pages: [
					{page: 1, part: '第一段', duration: 65},
					{page: 2, part: '第二段', duration: 30},
				],
			} as never,
			{
				body: [
					{from: 1, content: '第一句'},
					{from: 5, content: '第二句'},
				],
			} as never,
			[
				{
					ctime: 1_711_929_600,
					like: 10,
					member: {uname: '评论者'},
					content: {message: '很好看'},
				},
			] as never,
		);

		expect(markdown).toContain('platform: Bilibili (哔哩哔哩)');
		expect(markdown).toContain('# Bilibili 视频');
		expect(markdown).toContain('![封面](https://image.example.com/cover.jpg)');
		expect(markdown).toContain('## 分P列表');
		expect(markdown).toContain('[0:01] 第一句');
		expect(markdown).toContain('**评论者**');
		expect(markdown).toContain(
			'> 来源: https://www.bilibili.com/video/BV1xx411c7mD',
		);
	});

	it('flattens subtitle bodies into plain text', () => {
		expect(
			biliSubtitleToText({
				body: [{content: '第一句'}, {content: '第二句'}],
			} as never),
		).toBe('第一句\n第二句');
		expect(biliSubtitleToText({} as never)).toBe('');
	});

	it('handles long durations and omitted optional sections', () => {
		const markdown = biliVideoToMarkdown({
			bvid: 'BV2yy522d8nF',
			aid: 200,
			title: '长视频',
			desc: '',
			pic: '',
			pubdate: 1_711_929_600,
			duration: 3661,
			tname: '',
			owner: {name: 'UP', mid: 1},
			stat: {
				view: 100_000_000,
				like: 20_000,
				coin: 0,
				favorite: 0,
				danmaku: 0,
				reply: 0,
				share: 0,
			},
			pages: [{page: 1, part: 'Only', duration: 3661}],
		} as never);

		expect(markdown).toContain('duration: 1:01:01');
		expect(markdown).toContain('▶️ 1.0亿 | 👍 2.0万');
		expect(markdown).not.toContain('## 简介');
		expect(markdown).not.toContain('## 热门评论');
	});
});
