// Zhihu's REST API uses snake_case JSON keys verbatim and we mirror them in
// request bodies and query params. xo's strictCamelCase rule fires on every
// such key — disable it for this file.
/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/member-ordering */
import {CliError, ExitCode} from '../utils/exit-codes';
import type {ApiClient} from './client';
import type {
	QrCodeData,
	ZhihuAnswerSort,
	ZhihuCollectionRow,
	ZhihuColumnItem,
	ZhihuComment,
	ZhihuCommentTarget,
	ZhihuDraftRow,
	ZhihuFollowerRow,
	ZhihuFollowTarget,
	ZhihuImageInfo,
	ZhihuMe,
	ZhihuNotificationRow,
	ZhihuPaginatedResponse,
	ZhihuPaging,
	ZhihuPublishResult,
	ZhihuSearchType,
	ZhihuUserProfile,
	ZhihuVoteType,
} from './types';

const zhihuApiV4 = 'https://www.zhihu.com/api/v4';
const zhihuApiV3 = 'https://www.zhihu.com/api/v3';
const zhihuZhuanlanApi = 'https://zhuanlan.zhihu.com/api';
const zhihuBase = 'https://www.zhihu.com';
const sortByKey = 'sort_by';

const followTargetSegment: Record<ZhihuFollowTarget, string> = {
	user: 'members',
	question: 'questions',
	column: 'columns',
};

const commentTargetSegment: Record<ZhihuCommentTarget, string> = {
	answer: 'answers',
	article: 'articles',
	question: 'questions',
	pin: 'pins',
};
const zhihuDetailHeaders = {
	'x-requested-with': 'fetch',
	'x-zse-93': '101_3_3.0',
	'sec-fetch-dest': 'empty',
	'sec-fetch-mode': 'cors',
	'sec-fetch-site': 'same-origin',
};

export class ZhihuApi {
	constructor(private readonly client: ApiClient) {}

	// --- Column API ---

	async getColumnItems(
		columnId: string,
		offset = 0,
		limit = 10,
	): Promise<{items: ZhihuColumnItem[]; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/columns/${columnId}/items`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<ZhihuColumnItem>
		>(url, {
			offset: String(offset),
			limit: String(limit),
		});
		return {items: data.data, paging: data.paging};
	}

	// --- User API ---

	async getUserArticles(
		userId: string,
		offset = 0,
		limit = 20,
	): Promise<{items: Array<{id: number; title: string}>; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/members/${userId}/articles`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<{id: number; title: string}>
		>(url, {
			include: 'data[*].content',
			offset: String(offset),
			limit: String(limit),
		});
		return {items: data.data, paging: data.paging};
	}

	async getUserAnswers(
		userId: string,
		offset = 0,
		limit = 20,
	): Promise<{
		items: Array<{id: number; question: {id: number; title: string}}>;
		paging: ZhihuPaging;
	}> {
		const url = `${zhihuApiV4}/members/${userId}/answers`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<{
				id: number;
				question: {id: number; title: string};
			}>
		>(url, {
			include: 'data[*].content',
			offset: String(offset),
			limit: String(limit),
		});
		return {items: data.data, paging: data.paging};
	}

	async getUserProfile(userId: string): Promise<ZhihuUserProfile> {
		const url = `${zhihuApiV4}/members/${userId}`;
		const data = await this.client.getJson<Record<string, unknown>>(url, {
			include: 'answer_count,articles_count,follower_count,headline,avatar_url',
		});
		return {
			id: String(data.id ?? ''),
			name: String(data.name ?? ''),
			urlToken: String(data.url_token ?? userId),
			headline: String(data.headline ?? ''),
			avatarUrl: String(data.avatar_url ?? ''),
			answerCount: Number(data.answer_count ?? 0),
			articlesCount: Number(data.articles_count ?? 0),
			followerCount: Number(data.follower_count ?? 0),
		};
	}

	// --- Browse API ---

	async search(
		query: string,
		searchType: ZhihuSearchType = 'general',
		offset = 0,
		limit = 10,
	): Promise<{items: Array<Record<string, unknown>>; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/search_v3`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			q: query,
			t: searchType,
			offset: String(offset),
			limit: String(limit),
		});
		return {items: data.data, paging: data.paging};
	}

	async getHotList(limit = 20): Promise<Array<Record<string, unknown>>> {
		try {
			const url = `${zhihuApiV4}/creators/rank/hot`;
			const data = await this.client.getJson<{
				data: Array<Record<string, unknown>>;
			}>(url, {
				limit: String(limit),
			});
			return data.data;
		} catch {
			// Fallback
			const url = `${zhihuApiV3}/feed/topstory/hot-lists/total`;
			const data = await this.client.getJson<{
				data: Array<Record<string, unknown>>;
			}>(url, {
				limit: String(limit),
			});
			return data.data;
		}
	}

	async getQuestion(questionId: string): Promise<Record<string, unknown>> {
		const url = `${zhihuApiV4}/questions/${questionId}`;
		return this.client.getJson<Record<string, unknown>>(
			url,
			{
				include:
					'data[*].author,answer_count,follower_count,visit_count,comment_count,created_time,updated_time,detail,topics',
			},
			zhihuDetailHeaders,
		);
	}

	async getQuestionAnswers(
		questionId: string,
		offset = 0,
		limit = 5,
		sortBy: ZhihuAnswerSort = 'default',
	): Promise<{items: Array<Record<string, unknown>>; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/questions/${questionId}/answers`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			include:
				'data[*].content,voteup_count,comment_count,created_time,updated_time,author',
			offset: String(offset),
			limit: String(limit),
			[sortByKey]: sortBy,
		});
		return {items: data.data, paging: data.paging};
	}

	async getAnswer(answerId: string): Promise<Record<string, unknown>> {
		const url = `${zhihuApiV4}/answers/${answerId}`;
		return this.client.getJson<Record<string, unknown>>(url, {
			include:
				'content,voteup_count,comment_count,created_time,updated_time,author,question',
		});
	}

	async getFeed(limit = 10): Promise<Array<Record<string, unknown>>> {
		const url = `${zhihuApiV3}/feed/topstory/recommend`;
		const data = await this.client.getJson<{
			data: Array<Record<string, unknown>>;
		}>(url, {
			limit: String(limit),
		});
		return data.data;
	}

	async getTopic(topicId: string): Promise<Record<string, unknown>> {
		const url = `${zhihuApiV4}/topics/${topicId}`;
		return this.client.getJson<Record<string, unknown>>(
			url,
			undefined,
			zhihuDetailHeaders,
		);
	}

	// --- Auth API ---

	async getQrCode(): Promise<QrCodeData> {
		const url = `${zhihuApiV3}/account/api/login/qrcode`;
		const data = await this.client.postJson<Record<string, string>>(url, {});
		return {
			token: data.token ?? data.qrcode_token ?? '',
			link: data.link ?? '',
		};
	}

	async pollQrStatus(
		token: string,
	): Promise<{status: number; data: Record<string, unknown>}> {
		const url = `${zhihuApiV3}/account/api/login/qrcode/${token}/scan_info`;
		const data = await this.client.getJson<Record<string, unknown>>(url);
		return {
			status: Number(data.status ?? -1),
			data,
		};
	}

	async validateSession(): Promise<{
		valid: boolean;
		name?: string;
	}> {
		try {
			const data = await this.client.getJson<Record<string, unknown>>(
				`${zhihuApiV4}/me`,
			);
			return {valid: true, name: String(data.name ?? '')};
		} catch {
			return {valid: false};
		}
	}

	// --- Page fetching (for scraping) ---

	async getArticlePage(articleId: string): Promise<string> {
		return this.client.getHtml(`https://zhuanlan.zhihu.com/p/${articleId}`);
	}

	async getAnswerPage(questionId: string, answerId: string): Promise<string> {
		return this.client.getHtml(
			`${zhihuBase}/question/${questionId}/answer/${answerId}`,
		);
	}

	async getVideoPage(videoId: string): Promise<string> {
		return this.client.getHtml(`${zhihuBase}/zvideo/${videoId}`);
	}

	async getColumnPage(columnId: string): Promise<string> {
		return this.client.getHtml(`${zhihuBase}/column/${columnId}`);
	}

	async getUserPage(userId: string): Promise<string> {
		return this.client.getHtml(`${zhihuBase}/people/${userId}`);
	}

	// --- Account ---

	// GET /api/v4/me — full profile of the logged-in user.
	async getMe(): Promise<ZhihuMe> {
		const data = await this.client.getJson<Record<string, unknown>>(
			`${zhihuApiV4}/me`,
		);
		return {
			id: String(data.id ?? ''),
			name: String(data.name ?? ''),
			urlToken: String(data.url_token ?? ''),
			headline: String(data.headline ?? ''),
			avatarUrl: String(data.avatar_url ?? ''),
			email: data.email ? String(data.email) : undefined,
		};
	}

	// --- Interactions: voting ---

	// POST /api/v4/answers/{id}/voters — type: up | down | neutral
	async voteAnswer(answerId: string, voteType: ZhihuVoteType): Promise<void> {
		const url = `${zhihuApiV4}/answers/${answerId}/voters`;
		await this.client.postJson<Record<string, unknown>>(url, {
			type: voteType,
		});
	}

	// --- Interactions: follow / unfollow ---

	// POST/DELETE /api/v4/{members|questions|columns}/{id}/followers
	async follow(target: ZhihuFollowTarget, id: string): Promise<void> {
		const url = `${zhihuApiV4}/${followTargetSegment[target]}/${id}/followers`;
		await this.client.postJson<Record<string, unknown>>(url, {});
	}

	async unfollow(target: ZhihuFollowTarget, id: string): Promise<void> {
		const url = `${zhihuApiV4}/${followTargetSegment[target]}/${id}/followers`;
		await this.client.deleteJson<Record<string, unknown>>(url);
	}

	// --- Interactions: comments ---

	// GET /api/v4/comment_v5/{type}/{id}/root_comment — root comments only
	async listComments(
		target: ZhihuCommentTarget,
		targetId: string,
		offset = 0,
		limit = 20,
	): Promise<{items: ZhihuComment[]; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/comment_v5/${commentTargetSegment[target]}/${targetId}/root_comment`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			offset: String(offset),
			limit: String(limit),
			order_by: 'normal',
		});
		return {
			items: data.data.map(raw => normalizeComment(raw)),
			paging: data.paging,
		};
	}

	// POST /api/v4/comment_v5/{type}/{id}/comment — create a top-level comment
	// or reply (when replyCommentId is provided).
	async createComment(
		target: ZhihuCommentTarget,
		targetId: string,
		content: string,
		replyCommentId?: string,
	): Promise<ZhihuPublishResult> {
		const url = `${zhihuApiV4}/comment_v5/${commentTargetSegment[target]}/${targetId}/comment`;
		const body: Record<string, unknown> = {content, content_html: content};
		if (replyCommentId) body.reply_comment_id = replyCommentId;
		const data = await this.client.postJson<Record<string, unknown>>(url, body);
		const id = String(
			(data.id as string | number | undefined) ??
				(data.data as Record<string, unknown> | undefined)?.id ??
				'',
		);
		return {id, type: 'comment'};
	}

	// DELETE /api/v4/comments/{id}
	async deleteComment(commentId: string): Promise<boolean> {
		const url = `${zhihuApiV4}/comments/${commentId}`;
		await this.client.deleteJson<Record<string, unknown>>(url);
		return true;
	}

	// --- Lists ---

	// GET /api/v4/members/{id}/followers
	async getFollowers(
		userId: string,
		offset = 0,
		limit = 20,
	): Promise<{items: ZhihuFollowerRow[]; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/members/${userId}/followers`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			include: 'data[*].follower_count,headline,avatar_url',
			offset: String(offset),
			limit: String(limit),
		});
		return {
			items: data.data.map(raw => normalizeFollowerRow(raw)),
			paging: data.paging,
		};
	}

	// GET /api/v4/members/{id}/followees
	async getFollowing(
		userId: string,
		offset = 0,
		limit = 20,
	): Promise<{items: ZhihuFollowerRow[]; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/members/${userId}/followees`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			include: 'data[*].follower_count,headline,avatar_url',
			offset: String(offset),
			limit: String(limit),
		});
		return {
			items: data.data.map(raw => normalizeFollowerRow(raw)),
			paging: data.paging,
		};
	}

	// GET /api/v4/people/{id}/collections — bookmarks (收藏夹)
	async getCollections(
		userId: string,
		offset = 0,
		limit = 20,
	): Promise<{items: ZhihuCollectionRow[]; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/people/${userId}/collections`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			offset: String(offset),
			limit: String(limit),
		});
		return {
			items: data.data.map(raw => normalizeCollectionRow(raw)),
			paging: data.paging,
		};
	}

	// GET /api/v4/notifications/v2/recent
	async getNotifications(
		offset = 0,
		limit = 20,
	): Promise<{items: ZhihuNotificationRow[]; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/notifications/v2/recent`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			offset: String(offset),
			limit: String(limit),
		});
		return {
			items: data.data.map(raw => normalizeNotificationRow(raw)),
			paging: data.paging,
		};
	}

	// GET https://zhuanlan.zhihu.com/api/articles/drafts
	async getDrafts(
		offset = 0,
		limit = 20,
	): Promise<{items: ZhihuDraftRow[]; paging: ZhihuPaging}> {
		const url = `${zhihuZhuanlanApi}/articles/drafts`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			offset: String(offset),
			limit: String(limit),
		});
		return {
			items: data.data.map(raw => normalizeDraftRow(raw)),
			paging: data.paging,
		};
	}

	// --- Creation: draft-first architecture ---

	// POST /api/v4/content/drafts — returns the draft content_id for ask/pin/article.
	private async createContentDraft(
		action: 'article' | 'pin' | 'question',
	): Promise<string> {
		const data = await this.client.postJson<Record<string, unknown>>(
			`${zhihuApiV4}/content/drafts`,
			{action},
		);
		const id = String(
			(data.content_id as string | undefined) ??
				(data.id as string | undefined) ??
				'',
		);
		if (!id) {
			throw new CliError('创建草稿失败：未返回 content_id', ExitCode.PROTOCOL);
		}

		return id;
	}

	private async contentPublish(
		payload: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.client.postJson<Record<string, unknown>>(
			`${zhihuApiV4}/content/publish`,
			payload,
		);
	}

	// POST /api/v4/questions (no images) or content/publish (with images).
	async askQuestion(
		title: string,
		detail = '',
		topicIds: string[] = [],
		imageInfos: ZhihuImageInfo[] = [],
	): Promise<ZhihuPublishResult> {
		if (imageInfos.length === 0) {
			const data = await this.client.postJson<Record<string, unknown>>(
				`${zhihuApiV4}/questions`,
				{
					title,
					detail,
					topic_url_tokens: topicIds,
				},
			);
			const id = extractContentId(data);
			return {
				id,
				type: 'question',
				url: id ? `${zhihuBase}/question/${id}` : undefined,
			};
		}

		const draftId = await this.createContentDraft('question');
		const hybrid = renderHybridHtml(detail, imageInfos);
		const data = await this.contentPublish({
			action: 'question',
			title,
			topic: topicIds.map(t => ({id: t, type: 'topic'})),
			hybrid,
			extra_info: {},
			questionConfig: {
				comment_permission: 'all',
				draft_type: 'question',
			},
			draft: {id: draftId},
		});
		const id = extractContentId(data);
		return {
			id,
			type: 'question',
			url: id ? `${zhihuBase}/question/${id}` : undefined,
		};
	}

	// 想法 — POST /api/v4/content/publish with action: pin
	async createPin(
		title: string,
		content = '',
		imageInfos: ZhihuImageInfo[] = [],
	): Promise<ZhihuPublishResult> {
		const draftId = await this.createContentDraft('pin');
		const hybrid = renderHybridHtml(content, imageInfos);
		const data = await this.contentPublish({
			action: 'pin',
			title,
			hybrid,
			commentsPermission: 'all',
			extra_info: {},
			draft: {id: draftId},
		});
		const id = extractContentId(data);
		return {id, type: 'pin', url: id ? `${zhihuBase}/pin/${id}` : undefined};
	}

	// 文章 — three-step zhuanlan flow when no images, else content/publish flow.
	async publishArticle(
		title: string,
		content: string,
		topicIds: string[] = [],
		imageInfos: ZhihuImageInfo[] = [],
	): Promise<ZhihuPublishResult> {
		if (imageInfos.length === 0) {
			// 1) create draft
			const draftResponse = await this.client.postJson<Record<string, unknown>>(
				`${zhihuZhuanlanApi}/articles/drafts`,
				{},
			);
			const draftId = String(draftResponse.id ?? '');
			if (!draftId) {
				throw new CliError(
					'创建文章草稿失败：未返回草稿 ID',
					ExitCode.PROTOCOL,
				);
			}

			// 2) update draft body
			await this.client.patchJson<Record<string, unknown>>(
				`${zhihuZhuanlanApi}/articles/${draftId}/draft`,
				{title, content, topics: topicIds},
			);

			// 3) publish
			const published = await this.client.putJson<Record<string, unknown>>(
				`${zhihuZhuanlanApi}/articles/${draftId}/publish`,
				{column: null, commentPermission: 'anyone'},
			);
			const id = String(published.id ?? draftId);
			return {
				id,
				type: 'article',
				url: id ? `https://zhuanlan.zhihu.com/p/${id}` : undefined,
			};
		}

		const draftId = await this.createContentDraft('article');
		const hybrid = renderHybridHtml(content, imageInfos);
		const data = await this.contentPublish({
			action: 'article',
			title,
			hybrid,
			extra_info: {topics: topicIds},
			draft: {id: draftId},
			commentsPermission: 'anyone',
		});
		const id = extractContentId(data);
		return {
			id,
			type: 'article',
			url: id ? `https://zhuanlan.zhihu.com/p/${id}` : undefined,
		};
	}

	// --- Deletion ---

	async deleteQuestion(questionId: string): Promise<boolean> {
		await this.client.deleteJson<Record<string, unknown>>(
			`${zhihuApiV4}/questions/${questionId}`,
		);
		return true;
	}

	async deletePin(pinId: string): Promise<boolean> {
		await this.client.deleteJson<Record<string, unknown>>(
			`${zhihuApiV4}/pins/${pinId}`,
		);
		return true;
	}

	async deleteArticle(articleId: string): Promise<boolean> {
		await this.client.deleteJson<Record<string, unknown>>(
			`${zhihuZhuanlanApi}/articles/${articleId}`,
		);
		return true;
	}

	// --- Browse extensions used by the new flag-driven CLI surface ---

	// GET /api/v4/topics/{id}/feeds/top_question — questions in a topic.
	async getTopicQuestions(
		topicId: string,
		offset = 0,
		limit = 10,
	): Promise<{items: Array<Record<string, unknown>>; paging: ZhihuPaging}> {
		const url = `${zhihuApiV4}/topics/${topicId}/feeds/top_question`;
		const data = await this.client.getJson<
			ZhihuPaginatedResponse<Record<string, unknown>>
		>(url, {
			offset: String(offset),
			limit: String(limit),
		});
		return {items: data.data, paging: data.paging};
	}
}

function normalizeComment(raw: Record<string, unknown>): ZhihuComment {
	const author = (raw.author as Record<string, unknown> | undefined) ?? {};
	const member =
		(author.member as Record<string, unknown> | undefined) ?? author;
	return {
		id: String(raw.id ?? ''),
		content: String(raw.content ?? ''),
		author: {
			name: String(member.name ?? ''),
			urlToken: String(member.url_token ?? ''),
			avatarUrl: member.avatar_url ? String(member.avatar_url) : undefined,
			headline: member.headline ? String(member.headline) : undefined,
		},
		created: Number(raw.created_time ?? raw.created ?? 0),
		likeCount: Number(raw.like_count ?? raw.vote_count ?? 0),
	};
}

function normalizeFollowerRow(raw: Record<string, unknown>): ZhihuFollowerRow {
	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		urlToken: String(raw.url_token ?? ''),
		headline: String(raw.headline ?? ''),
		avatarUrl: String(raw.avatar_url ?? ''),
		followerCount: raw.follower_count ? Number(raw.follower_count) : undefined,
	};
}

function normalizeCollectionRow(
	raw: Record<string, unknown>,
): ZhihuCollectionRow {
	return {
		id: String(raw.id ?? ''),
		title: String(raw.title ?? ''),
		description: String(raw.description ?? ''),
		answerCount: Number(raw.answer_count ?? 0),
		followerCount: Number(raw.follower_count ?? 0),
		url: String(raw.url ?? ''),
	};
}

function normalizeNotificationRow(
	raw: Record<string, unknown>,
): ZhihuNotificationRow {
	const content = raw.content as Record<string, unknown> | undefined;
	const text =
		(content?.text as string | undefined) ??
		(raw.action_text as string | undefined) ??
		(raw.title as string | undefined) ??
		'';
	return {
		id: String(raw.id ?? ''),
		type: String(raw.type ?? raw.action ?? ''),
		content: String(text),
		created: Number(raw.created_time ?? raw.updated_time ?? 0),
		read: Boolean(raw.is_read ?? raw.read ?? false),
		url: raw.url ? String(raw.url) : undefined,
	};
}

function normalizeDraftRow(raw: Record<string, unknown>): ZhihuDraftRow {
	return {
		id: String(raw.id ?? ''),
		title: String(raw.title ?? '(无标题)'),
		updated: Number(raw.updated ?? raw.updated_time ?? 0),
		url: raw.url ? String(raw.url) : undefined,
	};
}

function extractContentId(data: Record<string, unknown>): string {
	if (typeof data.id === 'string' || typeof data.id === 'number') {
		return String(data.id);
	}

	const nested = data.data as Record<string, unknown> | undefined;
	if (
		nested &&
		(typeof nested.id === 'string' || typeof nested.id === 'number')
	) {
		return String(nested.id);
	}

	if (
		typeof data.content_id === 'string' ||
		typeof data.content_id === 'number'
	) {
		return String(data.content_id);
	}

	return '';
}

function renderHybridHtml(body: string, imageInfos: ZhihuImageInfo[]): string {
	const imageHtml = imageInfos
		.map(
			info =>
				`<img src="${info.src}" data-original-src="${info.originalSrc}" data-rawwidth="${info.width}" data-rawheight="${info.height}" />`,
		)
		.join('');
	const safeBody = body || '';
	return `<p>${safeBody}</p>${imageHtml}`;
}
