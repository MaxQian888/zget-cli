import {beforeEach, describe, expect, it, vi} from 'vitest';

const {readFileMock} = vi.hoisted(() => ({
	readFileMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	readFile: readFileMock,
	writeFile: vi.fn(),
	mkdir: vi.fn(),
}));

vi.mock('../../../source/core/utils/config', () => ({
	weiboCookieFile: 'D:/tmp/.zget-cli/weibo-cookies.json',
}));

import {WeiboCookieStore} from '../../../source/core/auth/weibo-auth';
import {WeiboApi} from '../../../source/core/api/weibo-api';

function makeAuthenticatedStore(): WeiboCookieStore {
	const store = new WeiboCookieStore();
	store.setCookies({
		SUB: 'sub',
		SUBP: 'subp',
		'XSRF-TOKEN': 'xsrf-99',
	});
	return store;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

describe('WeiboApi', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		readFileMock.mockReset();
	});

	it('GET unwraps {ok:1, data:T} and sends the cookie + standard headers', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				ok: 1,
				data: {band_list: [{realpos: 1, word: 'hi', num: 100}]},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new WeiboApi(makeAuthenticatedStore(), {throttleMs: 0});
		const items = await api.getHot();

		expect(items[0]).toMatchObject({
			rank: 1,
			word: 'hi',
			hot_value: 100,
			url: 'https://s.weibo.com/weibo?q=%23hi%23',
		});

		const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(calledUrl).toBe('https://weibo.com/ajax/statuses/hot_band');
		const headers = init.headers as Record<string, string>;
		expect(headers.Cookie).toContain('SUB=sub');
		expect(headers.Cookie).toContain('SUBP=subp');
		expect(headers.Referer).toBe('https://weibo.com/');
		expect(headers['X-Requested-With']).toBe('XMLHttpRequest');
	});

	it('GET maps 401 to NOPERM CliError with login hint', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 401}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new WeiboApi(makeAuthenticatedStore(), {throttleMs: 0});
		await expect(api.getHot()).rejects.toMatchObject({
			exitCode: 77,
			hint: '运行 zget weibo login',
		});
	});

	it('GET maps 5xx to TEMPFAIL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 503}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new WeiboApi(makeAuthenticatedStore(), {throttleMs: 0});
		await expect(api.getHot()).rejects.toMatchObject({exitCode: 75});
	});

	it('like() POSTs form-encoded body with X-XSRF-TOKEN header', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({ok: 1, data: {}}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new WeiboApi(makeAuthenticatedStore(), {throttleMs: 0});
		const result = await api.like('5145xxx');
		expect(result).toEqual({success: true, action: 'like', target: '5145xxx'});

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://weibo.com/ajax/like/update');
		expect(init.method).toBe('POST');
		const headers = init.headers as Record<string, string>;
		expect(headers['X-XSRF-TOKEN']).toBe('xsrf-99');
		expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
		const body = init.body as string;
		expect(body).toContain('id=5145xxx');
		expect(body).toContain('attitude=heart');
		expect(body).toContain('st=xsrf-99');
	});

	it('publishStatus() returns mid + url envelope', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				ok: 1,
				data: {
					mid: 'NEWMID123',
					idstr: 'NEWIDSTR',
					mblogid: 'PnewMblog',
					user: {idstr: '1234567890'},
				},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new WeiboApi(makeAuthenticatedStore(), {throttleMs: 0});
		const result = await api.publishStatus('hello world', ['picA', 'picB']);
		expect(result).toMatchObject({
			mid: 'NEWMID123',
			idstr: 'NEWIDSTR',
			url: 'https://weibo.com/1234567890/PnewMblog',
		});

		const body = fetchMock.mock.calls[0]?.[1]?.body as string;
		expect(body).toContain('content=hello+world');
		expect(body).toContain('picId=picA%2CpicB');
	});

	it('refuses POST when XSRF-TOKEN is missing', async () => {
		vi.stubGlobal('fetch', vi.fn());

		const store = new WeiboCookieStore();
		store.setCookies({SUB: 'sub', SUBP: 'subp'});
		const api = new WeiboApi(store, {throttleMs: 0});

		await expect(api.like('xxx')).rejects.toMatchObject({exitCode: 77});
	});

	it('search() scrapes s.weibo.com cards via cheerio', async () => {
		const html = `
			<html><body>
				<div class="card-wrap" mid="aaa">
					<div node-type="feed_list_content_full">第一条结果</div>
					<div class="info"><a class="name" href="//weibo.com/u/1">用户A</a></div>
					<div class="from"><a href="https://weibo.com/1/PstatusA">2 分钟前</a></div>
				</div>
				<div class="card-wrap" mid="bbb">
					<div node-type="feed_list_content">第二条 内容</div>
					<div class="info"><a class="name" href="https://weibo.com/u/2">用户B</a></div>
					<div class="from"><a href="https://weibo.com/2/PstatusB">5 分钟前</a></div>
				</div>
			</body></html>`;
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(html, {
				status: 200,
				headers: {'content-type': 'text/html'},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new WeiboApi(makeAuthenticatedStore(), {throttleMs: 0});
		const results = await api.search('test', 5);
		expect(results).toHaveLength(2);
		expect(results[0]).toMatchObject({mid: 'aaa', user_screen_name: '用户A'});
		expect(results[0]?.text).toContain('第一条结果');
		expect(results[1]).toMatchObject({mid: 'bbb', user_screen_name: '用户B'});
	});
});
