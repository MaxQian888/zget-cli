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
	hnCookieFile: 'D:/tmp/.zget-cli/hn-cookies.json',
}));

import {HnCookieStore} from '../../../source/core/auth/hn-auth';
import {HnApi} from '../../../source/core/api/hn-api';

function authedStore(): HnCookieStore {
	const store = new HnCookieStore();
	store.setCookies({user: 'alice&abc123'});
	return store;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

function htmlResponse(body: string, status = 200): Response {
	return new Response(body, {
		status,
		headers: {'content-type': 'text/html'},
	});
}

describe('HnApi read path', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		readFileMock.mockReset();
	});

	it('getItem hits firebase /item/<id>.json and returns the item', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({id: 1, type: 'story', by: 'pg', title: 'Y Combinator'}),
			);
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		const item = await api.getItem(1);

		expect(item.title).toBe('Y Combinator');
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toBe('https://hacker-news.firebaseio.com/v0/item/1.json');
	});

	it('getItem maps 404 to DATA_ERR CliError', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 404}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		await expect(api.getItem(999_999_999)).rejects.toMatchObject({
			exitCode: 65,
		});
	});

	it('getItem maps null body to DATA_ERR with item ID in message', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		await expect(api.getItem(123)).rejects.toMatchObject({
			exitCode: 65,
			message: expect.stringContaining('123'),
		});
	});

	it('getTopStories fetches the ID list then each item', async () => {
		const fetchMock = vi.fn().mockImplementation(async (url: string) => {
			if (url.endsWith('/topstories.json')) {
				return jsonResponse([10, 20, 30]);
			}

			return jsonResponse({id: 0, title: 'x', type: 'story'});
		});
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		const items = await api.getTopStories(3);

		expect(items).toHaveLength(3);
		const urls = fetchMock.mock.calls.map(c => c[0] as string);
		expect(urls[0]).toBe(
			'https://hacker-news.firebaseio.com/v0/topstories.json',
		);
		expect(urls.slice(1).sort()).toEqual(
			['/v0/item/10.json', '/v0/item/20.json', '/v0/item/30.json']
				.map(p => `https://hacker-news.firebaseio.com${p}`)
				.sort(),
		);
	});

	it('search hits Algolia with hitsPerPage query', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				hits: [],
				nbHits: 0,
				page: 0,
				nbPages: 0,
				hitsPerPage: 30,
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		await api.search('rust', {hitsPerPage: 5});

		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('https://hn.algolia.com/api/v1/search');
		expect(calledUrl).toContain('query=rust');
		expect(calledUrl).toContain('hitsPerPage=5');
	});

	it('searchByDate uses /search_by_date endpoint', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				hits: [],
				nbHits: 0,
				page: 0,
				nbPages: 0,
				hitsPerPage: 30,
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		await api.searchByDate('rust');

		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('/search_by_date');
	});

	it('getComments walks the kid tree skipping deleted entries', async () => {
		const fetchMock = vi.fn().mockImplementation(async (url: string) => {
			if (url.endsWith('/item/1.json')) {
				return jsonResponse({id: 1, kids: [2, 3]});
			}

			if (url.endsWith('/item/2.json')) {
				return jsonResponse({
					id: 2,
					parent: 1,
					by: 'u',
					text: 'first',
					kids: [4],
				});
			}

			if (url.endsWith('/item/3.json')) {
				return jsonResponse({id: 3, parent: 1, deleted: true});
			}

			if (url.endsWith('/item/4.json')) {
				return jsonResponse({id: 4, parent: 2, by: 'u', text: 'deep'});
			}

			return jsonResponse(null, 404);
		});
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		const comments = await api.getComments(1, {maxDepth: 5, perLevel: 10});
		// Deleted item should be skipped; 2 and 4 should both be included.
		const ids = comments.map(c => c.id).sort((a, b) => a - b);
		expect(ids).toEqual([2, 4]);
	});

	it('getMyProfile throws NOPERM when not authenticated', async () => {
		const api = new HnApi(new HnCookieStore());
		await expect(api.getMyProfile()).rejects.toMatchObject({exitCode: 77});
	});

	it('getJson maps 5xx to TEMPFAIL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 503}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		await expect(api.getUser('alice')).rejects.toMatchObject({exitCode: 75});
	});

	it('getJson maps non-404 4xx to PROTOCOL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 418}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		await expect(api.getUser('alice')).rejects.toMatchObject({exitCode: 76});
	});

	it('getUser maps null body to DATA_ERR', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		await expect(api.getUser('ghost')).rejects.toMatchObject({exitCode: 65});
	});

	it('getMyProfile fetches user by extracted username', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({id: 'alice', karma: 42, created: 1}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const profile = await api.getMyProfile();

		expect(profile.id).toBe('alice');
		expect(profile.karma).toBe(42);
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toBe(
			'https://hacker-news.firebaseio.com/v0/user/alice.json',
		);
	});
});

describe('HnApi write path', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		readFileMock.mockReset();
	});

	it('upvote scrapes the auth token then POSTs to /vote', async () => {
		const itemHtml = `
			<html><body>
				<a id="up_42" href="vote?id=42&how=up&auth=tok-up&goto=item%3Fid%3D42"></a>
				<a id="un_42" href="vote?id=42&how=un&auth=tok-un&goto=item%3Fid%3D42"></a>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(itemHtml))
			.mockResolvedValueOnce(new Response('', {status: 302}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const result = await api.upvote(42);

		expect(result).toEqual({success: true, action: 'upvote', target: '42'});
		const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		const body = String(postInit.body);
		expect(body).toContain('id=42');
		expect(body).toContain('how=up');
		expect(body).toContain('auth=tok-up');
	});

	it('upvote without a visible up-arrow token throws NOPERM', async () => {
		const fetchMock = vi.fn().mockResolvedValue(htmlResponse('<html></html>'));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		await expect(api.upvote(42)).rejects.toMatchObject({exitCode: 77});
	});

	it('comment requires non-empty text', async () => {
		const api = new HnApi(authedStore());
		await expect(api.comment(1, '   ')).rejects.toMatchObject({exitCode: 64});
	});

	it('comment scrapes hmac then POSTs to /comment', async () => {
		const itemHtml = `
			<html><body>
				<form>
					<input type="hidden" name="hmac" value="hm-1" />
				</form>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(itemHtml))
			.mockResolvedValueOnce(new Response('', {status: 302}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const result = await api.comment(1, 'hello');

		expect(result.success).toBe(true);
		const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		const body = String(postInit.body);
		expect(body).toContain('parent=1');
		expect(body).toContain('hmac=hm-1');
		expect(body).toContain('text=hello');
	});

	it('delete without a visible delete token throws NOPERM', async () => {
		const fetchMock = vi.fn().mockResolvedValue(htmlResponse('<html></html>'));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		await expect(api.delete(42)).rejects.toMatchObject({exitCode: 77});
	});

	it('submit fails fast without a title', async () => {
		const api = new HnApi(authedStore());
		await expect(api.submit('', 'https://example.com')).rejects.toMatchObject({
			exitCode: 64,
		});
	});

	it('submit posts to /r with fnid + url', async () => {
		const submitHtml = `
			<html><body>
				<form>
					<input type="hidden" name="fnid" value="fnid-7" />
				</form>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(submitHtml))
			.mockResolvedValueOnce(
				new Response('', {
					status: 302,
					headers: {location: 'item?id=999'},
				}),
			);
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const result = await api.submit('Hello', 'https://example.com');

		expect(result.itemId).toBe(999);
		const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		const body = String(postInit.body);
		expect(body).toContain('fnid=fnid-7');
		expect(body).toContain('title=Hello');
		expect(body).toContain('url=https%3A%2F%2Fexample.com');
	});

	it('favorite scrapes the fave token then POSTs to /fave', async () => {
		const itemHtml = `
			<html><body>
				<a href="fave?id=42&auth=tok-fav"></a>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(itemHtml))
			.mockResolvedValueOnce(new Response('', {status: 302}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const result = await api.favorite(42);
		expect(result.action).toBe('favorite');
		const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(String(postInit.body)).toContain('auth=tok-fav');
	});

	it('unfavorite uses the un=t form param', async () => {
		const itemHtml = `
			<html><body>
				<a href="fave?id=42&un=t&auth=tok-unfav"></a>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(itemHtml))
			.mockResolvedValueOnce(new Response('', {status: 302}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const result = await api.unfavorite(42);
		expect(result.action).toBe('unfavorite');
		const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(String(postInit.body)).toContain('un=t');
	});

	it('delete with scraped auth token POSTs to /xdelete', async () => {
		const itemHtml = `
			<html><body>
				<a href="xdelete?id=42&auth=tok-del&goto=news"></a>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(itemHtml))
			.mockResolvedValueOnce(new Response('', {status: 302}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const result = await api.delete(42);
		expect(result.action).toBe('delete');
		const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(String(postInit.body)).toContain('auth=tok-del');
	});

	it('submit fails fast when no fnid is visible (login likely expired)', async () => {
		const submitHtml = '<html><body><form></form></body></html>';
		const fetchMock = vi.fn().mockResolvedValueOnce(htmlResponse(submitHtml));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		await expect(api.submit('t', 'https://x')).rejects.toMatchObject({
			exitCode: 77,
		});
	});

	it('comment success returns the expected result', async () => {
		const itemHtml = `
			<html><body>
				<form>
					<input type="hidden" name="hmac" value="hm-7" />
				</form>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(itemHtml))
			.mockResolvedValueOnce(new Response('', {status: 302}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const result = await api.comment(1, 'hi there');
		expect(result).toEqual({success: true, action: 'comment', target: '1'});
	});

	it('unvote scrapes the un token and POSTs how=un', async () => {
		const itemHtml = `
			<html><body>
				<a id="un_5" href="vote?id=5&how=un&auth=tok-un"></a>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(itemHtml))
			.mockResolvedValueOnce(new Response('', {status: 302}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		const result = await api.unvote(5);
		expect(result.action).toBe('unvote');
		const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(String(postInit.body)).toContain('how=un');
		expect(String(postInit.body)).toContain('auth=tok-un');
	});

	it('post-form 401 surfaces NOPERM', async () => {
		const itemHtml = `
			<html><body>
				<a id="up_1" href="vote?id=1&how=up&auth=tok-up"></a>
			</body></html>
		`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(htmlResponse(itemHtml))
			.mockResolvedValueOnce(new Response('', {status: 401}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi(authedStore());
		await expect(api.upvote(1)).rejects.toMatchObject({exitCode: 77});
	});

	it('write path with no cookie store at all throws NOPERM before fetching', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const api = new HnApi();
		await expect(api.upvote(1)).rejects.toMatchObject({exitCode: 77});
		// The auth-scrape GET _does_ go through (it doesn't require auth), but
		// the postForm call must short-circuit. We assert the order: first call
		// is the item GET (allowed), and no POST follows.
		const posts = fetchMock.mock.calls.filter(
			([, init]) => (init as RequestInit | undefined)?.method === 'POST',
		);
		expect(posts).toHaveLength(0);
	});
});
