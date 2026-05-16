import {describe, expect, it} from 'vitest';
import {
	defaultUserAgent,
	getBiliHeaders,
	getBrowserHeaders,
	getBskyHeaders,
	getDoubanHeaders,
	getHnHeaders,
	getHtmlHeaders,
	getRedditHeaders,
	getV2exHeaders,
	getWeiboHeaders,
	getXhsHeaders,
	redditUserAgent,
} from '../../../source/core/utils/headers';

describe('header builders', () => {
	it('builds base browser headers', () => {
		const headers = getBrowserHeaders();

		expect(headers['User-Agent']).toBe(defaultUserAgent);
		expect(headers.Accept).toBe('application/json, text/plain, */*');
		expect(headers['Accept-Language']).toBe('en-US,en;q=0.9');
		expect(headers.Referer).toBe('https://www.zhihu.com/');
		expect(headers['sec-ch-ua-platform']).toBe('"Windows"');
	});

	it('builds html headers by overriding the accept header only', () => {
		const headers = getHtmlHeaders();

		expect(headers['User-Agent']).toBe(defaultUserAgent);
		expect(headers.Accept).toContain('text/html');
		expect(headers.Referer).toBe('https://www.zhihu.com/');
	});

	it('adds optional cookies for xhs and bili requests', () => {
		expect(getXhsHeaders().Cookie).toBeUndefined();
		expect(getBiliHeaders().Cookie).toBeUndefined();

		const xhsHeaders = getXhsHeaders('a1=token');
		expect(xhsHeaders.Cookie).toBe('a1=token');
		expect(xhsHeaders.Origin).toBe('https://www.xiaohongshu.com');
		expect(xhsHeaders.Referer).toBe('https://www.xiaohongshu.com/');

		const biliHeaders = getBiliHeaders('SESSDATA=token');
		expect(biliHeaders.Cookie).toBe('SESSDATA=token');
		expect(biliHeaders.Origin).toBe('https://www.bilibili.com');
		expect(biliHeaders.Referer).toBe('https://www.bilibili.com/');
	});

	it('weibo headers attach Cookie + CSRF only when provided', () => {
		const empty = getWeiboHeaders();
		expect(empty.Cookie).toBeUndefined();
		expect(empty['X-XSRF-TOKEN']).toBeUndefined();

		const h = getWeiboHeaders('SUB=1', 'csrf-1');
		expect(h.Cookie).toBe('SUB=1');
		expect(h['X-XSRF-TOKEN']).toBe('csrf-1');
	});

	it('reddit headers use the bot UA and add Authorization only with a token', () => {
		expect(getRedditHeaders()['User-Agent']).toBe(redditUserAgent);
		expect(getRedditHeaders().Authorization).toBeUndefined();
		expect(getRedditHeaders('tok-1').Authorization).toBe('Bearer tok-1');
	});

	it('hn headers attach Cookie when provided', () => {
		expect(getHnHeaders().Cookie).toBeUndefined();
		expect(getHnHeaders('user=x').Cookie).toBe('user=x');
		expect(getHnHeaders('user=x').Referer).toBe(
			'https://news.ycombinator.com/',
		);
	});

	it('v2ex headers attach Authorization when token provided', () => {
		expect(getV2exHeaders().Authorization).toBeUndefined();
		expect(getV2exHeaders('pat-1').Authorization).toBe('Bearer pat-1');
	});

	it('douban headers use a mobile UA and attach Cookie when provided', () => {
		const h = getDoubanHeaders('uid=1');
		expect(h['User-Agent']).toContain('iPhone');
		expect(h.Cookie).toBe('uid=1');
		expect(getDoubanHeaders().Cookie).toBeUndefined();
	});

	it('bsky headers attach Authorization when access JWT provided', () => {
		expect(getBskyHeaders().Authorization).toBeUndefined();
		expect(getBskyHeaders('jwt-1').Authorization).toBe('Bearer jwt-1');
	});
});
