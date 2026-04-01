import {describe, expect, it} from 'vitest';
import {
	defaultUserAgent,
	getBiliHeaders,
	getBrowserHeaders,
	getHtmlHeaders,
	getXhsHeaders,
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
});
