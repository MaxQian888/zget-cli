import type {ApiClient} from './client';
import type {
	QrCodeData,
	ZhihuColumnItem,
	ZhihuPaginatedResponse,
	ZhihuPaging,
	ZhihuUserProfile,
} from './types';

const zhihuApiV4 = 'https://www.zhihu.com/api/v4';
const zhihuApiV3 = 'https://www.zhihu.com/api/v3';
const zhihuBase = 'https://www.zhihu.com';
const sortByKey = 'sort_by';
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
		searchType = 'general',
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
		sortBy = 'default',
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
}
