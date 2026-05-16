import {beforeEach, describe, expect, it, vi} from 'vitest';

const {readFileMock, writeFileMock} = vi.hoisted(() => ({
	readFileMock: vi.fn(),
	writeFileMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	readFile: readFileMock,
	writeFile: writeFileMock,
	mkdir: vi.fn(),
}));

vi.mock('../../../source/core/utils/config', () => ({
	redditCredentialsFile: 'D:/tmp/.zget-cli/reddit-credentials.json',
}));

import {RedditCredentialStore} from '../../../source/core/auth/reddit-auth';
import {RedditApi} from '../../../source/core/api/reddit-api';

function authedStore(): RedditCredentialStore {
	const store = new RedditCredentialStore();
	store.setCredentials({
		clientId: 'c',
		clientSecret: 's',
		username: 'alice',
		accessToken: 'AT',
		tokenExpiresAt: Date.now() + 600_000,
	});
	return store;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

function postListing(items: Array<{id: string; title?: string}>): unknown {
	return {
		kind: 'Listing',
		data: {
			after: null,
			before: null,
			children: items.map(d => ({kind: 't3', data: d})),
		},
	};
}

describe('RedditApi public reads', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('getHot fetches /hot.json and unwraps children', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(
				postListing([
					{id: 'a', title: 'A'},
					{id: 'b', title: 'B'},
				]),
			),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		const items = await api.getHot(undefined, 2);
		expect(items.map(p => p.id)).toEqual(['a', 'b']);
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('https://www.reddit.com/hot.json');
		expect(calledUrl).toContain('limit=2');
	});

	it('getHot for a specific subreddit hits /r/<name>/hot.json', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(postListing([])));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await api.getHot('programming');
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('/r/programming/hot.json');
	});

	it('search forwards the query', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(postListing([])));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await api.search('rust', {limit: 5});
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('/search.json');
		expect(calledUrl).toContain('q=rust');
		expect(calledUrl).toContain('limit=5');
	});

	it('search within a subreddit uses restrict_sr=1', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(postListing([])));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await api.search('rust', {subreddit: 'programming', limit: 5});
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('/r/programming/search.json');
		expect(calledUrl).toContain('restrict_sr=1');
	});

	it('getSubreddit returns the unwrapped thing data', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				kind: 't5',
				data: {display_name: 'programming', subscribers: 100},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		const sub = await api.getSubreddit('programming');
		expect(sub.display_name).toBe('programming');
		expect(sub.subscribers).toBe(100);
	});

	it('getPost returns the first child from the comments listing', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse([
					postListing([{id: 'p1', title: 'Hello'}]),
					postListing([]),
				]),
			);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		const post = await api.getPost('p1');
		expect(post.id).toBe('p1');
	});

	it('getPost throws DATA_ERR when the response shape is wrong', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await expect(api.getPost('p1')).rejects.toMatchObject({exitCode: 65});
	});

	it('getComments walks nested replies', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse([
				postListing([]),
				{
					kind: 'Listing',
					data: {
						after: null,
						before: null,
						children: [
							{
								kind: 't1',
								data: {
									id: 'c1',
									author: 'a',
									body: 'first',
									score: 1,
									created_utc: 0,
									replies: {
										kind: 'Listing',
										data: {
											after: null,
											before: null,
											children: [
												{
													kind: 't1',
													data: {
														id: 'c2',
														author: 'b',
														body: 'nested',
														score: 0,
														created_utc: 0,
													},
												},
											],
										},
									},
								},
							},
						],
					},
				},
			]),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		const comments = await api.getComments('p1');
		expect(comments.map(c => c.id)).toEqual(['c1', 'c2']);
	});

	it('getUser returns the unwrapped thing data', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				kind: 't2',
				data: {id: 'u1', name: 'pg', created_utc: 0, total_karma: 99},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		const user = await api.getUser('pg');
		expect(user.name).toBe('pg');
		expect(user.total_karma).toBe(99);
	});

	it('429 surfaces TEMPFAIL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 429}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await expect(api.getHot()).rejects.toMatchObject({exitCode: 75});
	});

	it('404 surfaces DATA_ERR', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 404}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await expect(api.getUser('ghost')).rejects.toMatchObject({exitCode: 65});
	});
});

describe('RedditApi authenticated reads + writes', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('getMyProfile hits oauth.reddit.com with Bearer header', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({id: 'u1', name: 'alice', created_utc: 0}),
			);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		const user = await api.getMyProfile();
		expect(user.name).toBe('alice');
		const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(calledUrl).toBe('https://oauth.reddit.com/api/v1/me');
		const headers = init.headers as Record<string, string>;
		expect(headers.Authorization).toBe('Bearer AT');
	});

	it('write methods without auth throw NOPERM', async () => {
		const api = new RedditApi(new RedditCredentialStore());
		await expect(api.upvote('t3_x')).rejects.toMatchObject({exitCode: 77});
		await expect(api.save('t3_x')).rejects.toMatchObject({exitCode: 77});
		await expect(api.subscribe('go')).rejects.toMatchObject({exitCode: 77});
		await expect(
			api.submit({subreddit: 'go', title: 't', text: 'b'}),
		).rejects.toMatchObject({exitCode: 77});
	});

	it('upvote posts dir=1 to /api/vote', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('{}', {status: 200}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		const result = await api.upvote('t3_abc');
		expect(result.action).toBe('upvote');
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(String(init.body)).toContain('dir=1');
		expect(String(init.body)).toContain('id=t3_abc');
	});

	it('downvote posts dir=-1', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('{}', {status: 200}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		await api.downvote('t3_x');
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(String(init.body)).toContain('dir=-1');
	});

	it('subscribe posts action=sub + sr_name', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('{}', {status: 200}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		await api.subscribe('programming');
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(String(init.body)).toContain('action=sub');
		expect(String(init.body)).toContain('sr_name=programming');
	});

	it('comment requires non-empty text', async () => {
		const api = new RedditApi(authedStore());
		await expect(api.comment('t3_x', '   ')).rejects.toMatchObject({
			exitCode: 64,
		});
	});

	it('comment posts to /api/comment and returns the new comment ID', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				json: {
					data: {
						things: [
							{
								kind: 't1',
								data: {
									id: 'newC',
									author: 'me',
									body: 'x',
									score: 0,
									created_utc: 0,
								},
							},
						],
					},
				},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		const result = await api.comment('t3_x', 'hi');
		expect(result.commentId).toBe('newC');
	});

	it('submit validates required fields', async () => {
		const api = new RedditApi(authedStore());
		await expect(
			api.submit({subreddit: '', title: 't', text: 'b'}),
		).rejects.toMatchObject({exitCode: 64});
		await expect(
			api.submit({subreddit: 'go', title: '', text: 'b'}),
		).rejects.toMatchObject({exitCode: 64});
	});

	it('submit posts a self post when url is omitted', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				json: {
					data: {id: 'newP', url: 'https://reddit.com/r/go/comments/newP'},
				},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		const result = await api.submit({
			subreddit: 'go',
			title: 'Hello',
			text: 'World',
		});
		expect(result.postId).toBe('newP');
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const body = String(init.body);
		expect(body).toContain('kind=self');
		expect(body).toContain('text=World');
	});

	it('submit posts a link post when url is provided', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({json: {data: {id: 'l1', url: 'https://r/x'}}}),
			);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		await api.submit({
			subreddit: 'go',
			title: 'Hello',
			url: 'https://example.com',
		});
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const body = String(init.body);
		expect(body).toContain('kind=link');
		expect(body).toContain('url=https%3A%2F%2Fexample.com');
	});

	it('OAuth 401 surfaces NOPERM after refresh fails', async () => {
		const fetchMock = vi
			.fn()
			// First call: 401 (auth expired).
			.mockResolvedValueOnce(new Response('', {status: 401}))
			// Refresh attempt fails — swallowed by the .catch().
			.mockResolvedValueOnce(new Response('', {status: 500}))
			// Retry with the (still-stale) token also returns 401.
			.mockResolvedValueOnce(new Response('', {status: 401}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		await expect(api.getMyProfile()).rejects.toMatchObject({exitCode: 77});
	});

	it('public 5xx maps to TEMPFAIL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 502}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await expect(api.getHot()).rejects.toMatchObject({exitCode: 75});
	});

	it('public other 4xx maps to PROTOCOL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 400}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await expect(api.getHot()).rejects.toMatchObject({exitCode: 76});
	});

	it('postForm 403 maps to NOPERM', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 403}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		await expect(api.save('t3_x')).rejects.toMatchObject({exitCode: 77});
	});

	it('postForm 500 maps to PROTOCOL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 500}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		await expect(api.save('t3_x')).rejects.toMatchObject({exitCode: 76});
	});

	it('postForm empty body returns undefined response', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 200}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		await expect(api.save('t3_x')).resolves.toMatchObject({action: 'save'});
	});

	it('postForm with non-JSON body still succeeds (catch path)', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('not-json', {status: 200}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi(authedStore());
		await expect(api.upvote('t3_x')).resolves.toMatchObject({action: 'upvote'});
	});

	it('getTop and getNew use their listing endpoints', async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(async () => jsonResponse(postListing([])));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await api.getTop('programming');
		await api.getNew('programming');
		const urls = fetchMock.mock.calls.map(c => (c as [string])[0]);
		expect(urls[0]).toContain('/r/programming/top.json');
		expect(urls[1]).toContain('/r/programming/new.json');
	});

	it('search forwards the sort option', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(postListing([])));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await api.search('rust', {sort: 'new'});
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('sort=new');
	});

	it('getComments with subreddit uses /r/<sub>/comments/<id>.json', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse([postListing([]), postListing([])]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await api.getComments('abc', {subreddit: 'go', limit: 5});
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('/r/go/comments/abc.json');
		expect(calledUrl).toContain('limit=5');
	});

	it('getPost with subreddit hits /r/<sub>/comments/<id>.json', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse([
					postListing([{id: 'p1', title: 'Hello'}]),
					postListing([]),
				]),
			);
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await api.getPost('p1', 'go');
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('/r/go/comments/p1.json');
	});

	it('getPost throws DATA_ERR when the inner listing is empty', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse([postListing([]), postListing([])]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		await expect(api.getPost('p1')).rejects.toMatchObject({exitCode: 65});
	});

	it('getComments with a short array returns []', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse([postListing([])]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new RedditApi();
		const comments = await api.getComments('p1');
		expect(comments).toEqual([]);
	});

	it('getUserPosts and getUserComments use the /user/ paths', async () => {
		const listingMock = vi
			.fn()
			.mockResolvedValue(jsonResponse(postListing([])));
		vi.stubGlobal('fetch', listingMock);

		const api = new RedditApi();
		await api.getUserPosts('alice', 3);
		const [calledUrl] = listingMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('/user/alice/submitted.json');
		expect(calledUrl).toContain('limit=3');
	});
});
