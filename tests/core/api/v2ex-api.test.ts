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
	v2exTokenFile: 'D:/tmp/.zget-cli/v2ex-token.json',
}));

import {V2exTokenStore} from '../../../source/core/auth/v2ex-auth';
import {V2exApi} from '../../../source/core/api/v2ex-api';

function authedStore(): V2exTokenStore {
	const store = new V2exTokenStore();
	store.setToken('pat-abc');
	return store;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

describe('V2exApi v1 (public) reads', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		readFileMock.mockReset();
	});

	it('getHot returns the topic array from /api/topics/hot.json', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse([{id: 1, title: 'A', replies: 0}]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		const items = await api.getHot();
		expect(items).toHaveLength(1);
		expect(items[0]?.title).toBe('A');
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toBe('https://www.v2ex.com/api/topics/hot.json');
	});

	it('getTopic returns the first element from /topics/show.json?id=N', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse([{id: 7, title: 'T7', replies: 5}]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		const topic = await api.getTopic(7);
		expect(topic.title).toBe('T7');
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('/topics/show.json?id=7');
	});

	it('getTopic throws DATA_ERR when the array is empty', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		await expect(api.getTopic(0)).rejects.toMatchObject({exitCode: 65});
	});

	it('v1 5xx maps to TEMPFAIL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 503}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		await expect(api.getHot()).rejects.toMatchObject({exitCode: 75});
	});

	it('v1 4xx maps to PROTOCOL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 400}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		await expect(api.getHot()).rejects.toMatchObject({exitCode: 76});
	});

	it('getReplies forwards the topic_id query param', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		await api.getReplies(99, {page: 2});
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('topic_id=99');
		expect(calledUrl).toContain('page=2');
	});

	it('getMember throws DATA_ERR when no record is returned', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		await expect(api.getMember('ghost')).rejects.toMatchObject({
			exitCode: 65,
		});
	});

	it('getNode encodes the node name', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse([{id: 1, name: 'go', title: 'Go'}]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		const node = await api.getNode('go');
		expect(node.title).toBe('Go');
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('name=go');
	});
});

describe('V2exApi v2 (Bearer) reads + writes', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('getMyMember sends Authorization: Bearer and unwraps result', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				success: true,
				result: {id: 42, username: 'alice'},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const member = await api.getMyMember();
		expect(member.username).toBe('alice');
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const headers = init.headers as Record<string, string>;
		expect(headers.Authorization).toBe('Bearer pat-abc');
	});

	it('getMyMember without a token throws NOPERM', async () => {
		const api = new V2exApi();
		await expect(api.getMyMember()).rejects.toMatchObject({exitCode: 77});
	});

	it('v2 401 maps to NOPERM', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 401}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		await expect(api.getMyMember()).rejects.toMatchObject({exitCode: 77});
	});

	it('v2 500 maps to TEMPFAIL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 500}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		await expect(api.getMyMember()).rejects.toMatchObject({exitCode: 75});
	});

	it('v2 success=false maps to PROTOCOL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: false, message: 'bad token'}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		await expect(api.getMyMember()).rejects.toMatchObject({exitCode: 76});
	});

	it('collect POSTs to /topics/<id>/collect', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: null}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const result = await api.collect(123);
		expect(result.action).toBe('collect');
		const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/topics/123/collect');
		expect(init.method).toBe('POST');
	});

	it('uncollect DELETEs /topics/<id>/collect', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: null}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const result = await api.uncollect(123);
		expect(result.action).toBe('uncollect');
		const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('DELETE');
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/topics/123/collect');
	});

	it('thankTopic POSTs to /topics/<id>/thank', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: null}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const result = await api.thankTopic(7);
		expect(result.action).toBe('thank-topic');
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/topics/7/thank');
	});

	it('thankReply POSTs to /replies/<id>/thank', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: null}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const result = await api.thankReply(8);
		expect(result.action).toBe('thank-reply');
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/replies/8/thank');
	});

	it('reply requires non-empty text', async () => {
		const api = new V2exApi(authedStore());
		await expect(api.reply(1, '   ')).rejects.toMatchObject({exitCode: 64});
	});

	it('reply POSTs JSON body to /topics/<id>/replies', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: null}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const result = await api.reply(11, 'hello');
		expect(result.action).toBe('reply');
		const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/topics/11/replies');
		expect(String(init.body)).toContain('"content":"hello"');
	});

	it('deleteReply DELETEs /replies/<id>', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: null}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const result = await api.deleteReply(8);
		expect(result.action).toBe('delete-reply');
		const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('DELETE');
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/replies/8');
	});

	it('newTopic validates inputs', async () => {
		const api = new V2exApi(authedStore());
		await expect(api.newTopic('', 't', 'b')).rejects.toMatchObject({
			exitCode: 64,
		});
		await expect(api.newTopic('node', '', 'b')).rejects.toMatchObject({
			exitCode: 64,
		});
		await expect(api.newTopic('node', 't', '')).rejects.toMatchObject({
			exitCode: 64,
		});
	});

	it('newTopic POSTs to /nodes/<name>/topics and returns the topic URL', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: {id: 777}}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const result = await api.newTopic('go', 'Hello', 'World');
		expect(result.topicId).toBe(777);
		expect(result.url).toBe('https://www.v2ex.com/t/777');
		const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/nodes/go/topics');
		expect(String(init.body)).toContain('"title":"Hello"');
		expect(String(init.body)).toContain('"content":"World"');
	});

	it('write methods without a token throw NOPERM', async () => {
		const api = new V2exApi();
		await expect(api.collect(1)).rejects.toMatchObject({exitCode: 77});
		await expect(api.thankTopic(1)).rejects.toMatchObject({exitCode: 77});
		await expect(api.deleteReply(1)).rejects.toMatchObject({exitCode: 77});
	});

	it('v2 403 maps to NOPERM', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 403}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		await expect(api.getMyMember()).rejects.toMatchObject({exitCode: 77});
	});

	it('v2 empty body resolves to undefined (DELETE flow)', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response('', {status: 200}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		await expect(api.uncollect(1)).resolves.toMatchObject({
			action: 'uncollect',
		});
	});

	it('newTopic falls back to siteBase when the response has no id', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: null}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		const result = await api.newTopic('go', 'Hello', 'World');
		expect(result.topicId).toBe(0);
		expect(result.url).toBe('https://www.v2ex.com');
	});

	it('getNotifications appends ?p=N when a page is given', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: []}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		await api.getNotifications({page: 3});
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/notifications?p=3');
	});

	it('getMyTopics appends ?p=N when a page is given', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({success: true, result: []}));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi(authedStore());
		await api.getMyTopics({page: 2});
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toBe('https://www.v2ex.com/api/v2/topics?p=2');
	});

	it('getNodeTopics appends &page=N when a page is given', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
		vi.stubGlobal('fetch', fetchMock);

		const api = new V2exApi();
		await api.getNodeTopics('go', {page: 2});
		const [calledUrl] = fetchMock.mock.calls[0] as [string];
		expect(calledUrl).toContain('node_name=go');
		expect(calledUrl).toContain('page=2');
	});
});
