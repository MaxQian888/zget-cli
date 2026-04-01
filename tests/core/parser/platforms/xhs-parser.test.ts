import {describe, expect, it} from 'vitest';
import {
	extractXhsImageUrls,
	xhsNoteToMarkdown,
} from '../../../../source/core/parser/platforms/xhs-parser';

describe('xhs parser', () => {
	it('renders rich note markdown with media, tags, and comments', () => {
		const markdown = xhsNoteToMarkdown(
			{
				noteId: 'note-1',
				title: '小红书标题',
				description: '正文内容',
				type: 'video',
				likeCount: 12,
				collectCount: 8,
				commentCount: 3,
				shareCount: 1,
				createTime: '1711929600000',
				videoUrl: 'https://video.example.com/1',
				imageList: [{url: 'https://image.example.com/1.jpg'}],
				tags: [{name: '旅行'}, {name: '摄影'}],
				user: {nickname: '作者甲'},
			} as never,
			[
				{
					nickname: '评论者',
					createTime: '1711929600000',
					content: '很有用',
					likeCount: 5,
					subComments: [
						{
							nickname: '回复者',
							createTime: '1711929600000',
							content: '谢谢',
						},
					],
				},
			] as never,
		);

		expect(markdown).toContain('platform: 小红书 (Xiaohongshu)');
		expect(markdown).toContain('# 小红书标题');
		expect(markdown).toContain('## 图片');
		expect(markdown).toContain('## 视频');
		expect(markdown).toContain('#旅行 #摄影');
		expect(markdown).toContain('**评论者**');
		expect(markdown).toContain('**回复者**');
		expect(markdown).toContain(
			'> 来源: https://www.xiaohongshu.com/explore/note-1',
		);
	});

	it('extracts only truthy image urls', () => {
		expect(
			extractXhsImageUrls({
				imageList: [{url: 'https://image.example.com/1.jpg'}, {url: ''}],
			} as never),
		).toEqual(['https://image.example.com/1.jpg']);
	});

	it('omits optional sections when a note has no extra media or comments', () => {
		const markdown = xhsNoteToMarkdown({
			noteId: 'note-2',
			title: '',
			description: '',
			type: 'normal',
			likeCount: 0,
			collectCount: 0,
			commentCount: 0,
			shareCount: 0,
			imageList: [],
			tags: [],
			user: {nickname: '作者乙'},
		} as never);

		expect(markdown).toContain('type: 图文');
		expect(markdown).not.toContain('## 图片');
		expect(markdown).not.toContain('## 视频');
		expect(markdown).not.toContain('## 标签');
		expect(markdown).not.toContain('## 评论');
	});
});
