import {describe, expect, it} from 'vitest';
import {
	extractWeixinContent,
	extractWeixinMetadata,
	preprocessWeixinImages,
} from '../../../../source/core/parser/platforms/weixin-parser';

describe('weixin parser', () => {
	it('extracts metadata and content from article pages', () => {
		const html = `
			<h1 id="activity-name">公众号文章</h1>
			<div id="meta_content"><a>作者甲</a></div>
			<script type="text/javascript">var publish_time = "2026-04-02";</script>
			<div id="js_content"><p>正文</p></div>
		`;

		expect(
			extractWeixinMetadata(html, 'https://mp.weixin.qq.com/s?id=1'),
		).toEqual({
			title: '公众号文章',
			author: '作者甲',
			date: '20260402',
			url: 'https://mp.weixin.qq.com/s?id=1',
		});
		expect(extractWeixinContent(html)).toContain('<p>正文</p>');
	});

	it('normalizes image src attributes from data-src', () => {
		const html = preprocessWeixinImages(`
			<div>
				<img data-src="https://mmbiz.qpic.cn/cover?wx_fmt=jpeg" />
				<img src="https://cdn.example.com/existing.png" data-src="https://ignored" />
			</div>
		`);

		expect(html).toContain('src="https://mmbiz.qpic.cn/cover?wx_fmt=jpeg"');
		expect(html).toContain('src="https://cdn.example.com/existing.png"');
	});

	it('falls back to alternative author selectors', () => {
		expect(
			extractWeixinMetadata(
				`
					<h1>备用标题</h1>
					<a id="js_name">备用作者</a>
					<script type="text/javascript">window.publish = "2026-04-03";</script>
				`,
				'https://mp.weixin.qq.com/s?id=2',
			),
		).toEqual({
			title: '备用标题',
			author: '备用作者',
			date: '20260403',
			url: 'https://mp.weixin.qq.com/s?id=2',
		});
	});
});
