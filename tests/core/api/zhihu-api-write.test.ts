import {describe, expect, it, vi} from 'vitest';
import {ZhihuApi} from '../../../source/core/api/zhihu-api';

function makeStubClient() {
	const emptyPage = {data: [], paging: {is_end: true, next: '', previous: ''}};
	return {
		getJson: vi.fn().mockResolvedValue(emptyPage),
		postJson: vi.fn().mockResolvedValue({}),
		putJson: vi.fn().mockResolvedValue({}),
		patchJson: vi.fn().mockResolvedValue({}),
		deleteJson: vi.fn().mockResolvedValue({}),
		getHtml: vi.fn().mockResolvedValue(''),
	};
}

describe('ZhihuApi write operations', () => {
	it('voteAnswer POSTs to /answers/{id}/voters with type', async () => {
		const client = makeStubClient();
		const api = new ZhihuApi(client as never);
		await api.voteAnswer('123', 'up');
		expect(client.postJson).toHaveBeenCalledWith(
			'https://www.zhihu.com/api/v4/answers/123/voters',
			{type: 'up'},
		);
		await api.voteAnswer('123', 'neutral');
		expect(client.postJson).toHaveBeenLastCalledWith(
			'https://www.zhihu.com/api/v4/answers/123/voters',
			{type: 'neutral'},
		);
	});

	it('follow / unfollow user uses members segment', async () => {
		const client = makeStubClient();
		const api = new ZhihuApi(client as never);
		await api.follow('user', 'alice');
		expect(client.postJson).toHaveBeenCalledWith(
			'https://www.zhihu.com/api/v4/members/alice/followers',
			{},
		);
		await api.unfollow('user', 'alice');
		expect(client.deleteJson).toHaveBeenCalledWith(
			'https://www.zhihu.com/api/v4/members/alice/followers',
		);
	});

	it('follow question and column route to correct segment', async () => {
		const client = makeStubClient();
		const api = new ZhihuApi(client as never);
		await api.follow('question', '999');
		expect(client.postJson).toHaveBeenLastCalledWith(
			'https://www.zhihu.com/api/v4/questions/999/followers',
			{},
		);
		await api.follow('column', 'colId');
		expect(client.postJson).toHaveBeenLastCalledWith(
			'https://www.zhihu.com/api/v4/columns/colId/followers',
			{},
		);
	});

	it('createComment POSTs to comment_v5 endpoint and supports reply', async () => {
		const client = makeStubClient();
		client.postJson.mockResolvedValue({id: 42});
		const api = new ZhihuApi(client as never);
		const result = await api.createComment('answer', '123', '好评论');
		expect(client.postJson).toHaveBeenCalledWith(
			'https://www.zhihu.com/api/v4/comment_v5/answers/123/comment',
			{content: '好评论', content_html: '好评论'},
		);
		expect(result.id).toBe('42');

		await api.createComment('article', 'a-1', 'reply', 'c-99');
		expect(client.postJson).toHaveBeenLastCalledWith(
			'https://www.zhihu.com/api/v4/comment_v5/articles/a-1/comment',
			{content: 'reply', content_html: 'reply', reply_comment_id: 'c-99'},
		);
	});

	it('deleteComment uses /comments/{id}', async () => {
		const client = makeStubClient();
		const api = new ZhihuApi(client as never);
		await api.deleteComment('cid');
		expect(client.deleteJson).toHaveBeenCalledWith(
			'https://www.zhihu.com/api/v4/comments/cid',
		);
	});

	it('askQuestion without images posts to /questions directly', async () => {
		const client = makeStubClient();
		client.postJson.mockResolvedValue({id: 'q-1'});
		const api = new ZhihuApi(client as never);
		const result = await api.askQuestion('标题', '正文', ['t1']);
		expect(client.postJson).toHaveBeenCalledWith(
			'https://www.zhihu.com/api/v4/questions',
			{title: '标题', detail: '正文', topic_url_tokens: ['t1']},
		);
		expect(result.type).toBe('question');
		expect(result.id).toBe('q-1');
	});

	it('askQuestion with images uses content/publish flow', async () => {
		const client = makeStubClient();
		// First call: createContentDraft. Second: contentPublish.
		client.postJson
			.mockResolvedValueOnce({content_id: 'draft-1'})
			.mockResolvedValueOnce({id: 'q-7'});
		const api = new ZhihuApi(client as never);
		const result = await api.askQuestion(
			'标题',
			'正文',
			[],
			[
				{
					imageId: 'img-1',
					src: 'https://pic1.zhimg.com/img-1_r.jpg',
					originalSrc: 'https://pic1.zhimg.com/img-1_r.jpg',
					width: 100,
					height: 100,
				},
			],
		);
		expect(client.postJson).toHaveBeenNthCalledWith(
			1,
			'https://www.zhihu.com/api/v4/content/drafts',
			{action: 'question'},
		);
		expect(client.postJson).toHaveBeenNthCalledWith(
			2,
			'https://www.zhihu.com/api/v4/content/publish',
			expect.objectContaining({
				action: 'question',
				title: '标题',
				draft: {id: 'draft-1'},
			}),
		);
		expect(result.id).toBe('q-7');
	});

	it('publishArticle without images uses three-step zhuanlan flow', async () => {
		const client = makeStubClient();
		client.postJson.mockResolvedValueOnce({id: 'd-1'});
		client.patchJson.mockResolvedValueOnce({});
		client.putJson.mockResolvedValueOnce({id: 'a-1'});
		const api = new ZhihuApi(client as never);
		const result = await api.publishArticle('标题', '<p>正文</p>', ['topic-x']);
		expect(client.postJson).toHaveBeenCalledWith(
			'https://zhuanlan.zhihu.com/api/articles/drafts',
			{},
		);
		expect(client.patchJson).toHaveBeenCalledWith(
			'https://zhuanlan.zhihu.com/api/articles/d-1/draft',
			{title: '标题', content: '<p>正文</p>', topics: ['topic-x']},
		);
		expect(client.putJson).toHaveBeenCalledWith(
			'https://zhuanlan.zhihu.com/api/articles/d-1/publish',
			{column: null, commentPermission: 'anyone'},
		);
		expect(result.id).toBe('a-1');
		expect(result.type).toBe('article');
	});

	it('createPin uses content/publish with action: pin', async () => {
		const client = makeStubClient();
		client.postJson
			.mockResolvedValueOnce({content_id: 'pin-draft'})
			.mockResolvedValueOnce({id: 'p-1'});
		const api = new ZhihuApi(client as never);
		const result = await api.createPin('标题', '正文');
		expect(client.postJson).toHaveBeenNthCalledWith(
			1,
			'https://www.zhihu.com/api/v4/content/drafts',
			{action: 'pin'},
		);
		expect(client.postJson).toHaveBeenNthCalledWith(
			2,
			'https://www.zhihu.com/api/v4/content/publish',
			expect.objectContaining({action: 'pin', title: '标题'}),
		);
		expect(result.type).toBe('pin');
		expect(result.id).toBe('p-1');
	});

	it('delete operations hit DELETE endpoints', async () => {
		const client = makeStubClient();
		const api = new ZhihuApi(client as never);
		await api.deleteQuestion('q1');
		await api.deletePin('p1');
		await api.deleteArticle('a1');
		expect(client.deleteJson).toHaveBeenNthCalledWith(
			1,
			'https://www.zhihu.com/api/v4/questions/q1',
		);
		expect(client.deleteJson).toHaveBeenNthCalledWith(
			2,
			'https://www.zhihu.com/api/v4/pins/p1',
		);
		expect(client.deleteJson).toHaveBeenNthCalledWith(
			3,
			'https://zhuanlan.zhihu.com/api/articles/a1',
		);
	});

	it('list endpoints query the correct URLs', async () => {
		const client = makeStubClient();
		const api = new ZhihuApi(client as never);
		await api.getNotifications(0, 10);
		expect(client.getJson).toHaveBeenLastCalledWith(
			'https://www.zhihu.com/api/v4/notifications/v2/recent',
			{offset: '0', limit: '10'},
		);
		await api.getDrafts(5, 20);
		expect(client.getJson).toHaveBeenLastCalledWith(
			'https://zhuanlan.zhihu.com/api/articles/drafts',
			{offset: '5', limit: '20'},
		);
		await api.getCollections('alice', 0, 10);
		expect(client.getJson).toHaveBeenLastCalledWith(
			'https://www.zhihu.com/api/v4/people/alice/collections',
			{offset: '0', limit: '10'},
		);
	});

	it('search exposes the search type as `t` query param', async () => {
		const client = makeStubClient();
		const api = new ZhihuApi(client as never);
		await api.search('react', 'people', 0, 5);
		expect(client.getJson).toHaveBeenLastCalledWith(
			'https://www.zhihu.com/api/v4/search_v3',
			{q: 'react', t: 'people', offset: '0', limit: '5'},
		);
	});

	it('getMe normalizes the v4/me response', async () => {
		const client = makeStubClient();
		client.getJson.mockResolvedValueOnce({
			id: 'u1',
			name: 'Alice',
			url_token: 'alice',
			headline: 'hi',
			avatar_url: 'http://a.png',
		});
		const api = new ZhihuApi(client as never);
		const me = await api.getMe();
		expect(me).toEqual({
			id: 'u1',
			name: 'Alice',
			urlToken: 'alice',
			headline: 'hi',
			avatarUrl: 'http://a.png',
			email: undefined,
		});
	});
});
