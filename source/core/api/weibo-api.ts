import * as cheerio from 'cheerio';
import type {
	WeiboApiResponse,
	WeiboCommentEntry,
	WeiboFeedKind,
	WeiboHotBandRaw,
	WeiboHotItem,
	WeiboInteractResult,
	WeiboLongText,
	WeiboPublishResult,
	WeiboSearchResult,
	WeiboStatus,
	WeiboUser,
	WeiboUserDetail,
} from '../../types/weibo';
import type {WeiboCookieStore} from '../auth/weibo-auth';
import {CliError, ExitCode} from '../utils/exit-codes';
import {getWeiboHeaders} from '../utils/headers';

const weiboApiBase = 'https://weibo.com';
const searchBase = 'https://s.weibo.com';

const TIMELINE_ENDPOINTS: Record<WeiboFeedKind, string> = {
	'for-you': 'unreadfriendstimeline',
	following: 'friendstimeline',
};

export type WeiboApiOptions = {
	throttleMs?: number;
};

export class WeiboApi {
	private lastRequestTime = 0;
	private readonly throttleMs: number;

	constructor(
		private readonly cookieStore: WeiboCookieStore,
		options: WeiboApiOptions = {},
	) {
		this.throttleMs = options.throttleMs ?? 250;
	}

	// ---------- Account ----------

	async getMyUid(): Promise<string> {
		// /ajax/config/get_config returns {ok:1, data:{uid:"<id>", ...}}
		const data = await this.get<{uid?: string | number}>(
			'/ajax/config/get_config',
		);
		const uid = data?.uid ? String(data.uid) : '';
		if (!uid) {
			throw new CliError(
				'未登录或无法解析 uid，请先运行 "zget weibo login"',
				ExitCode.NOPERM,
				'运行 zget weibo login',
			);
		}

		return uid;
	}

	async getMyProfile(): Promise<WeiboUser> {
		const uid = await this.getMyUid();
		return this.getUser({uid});
	}

	// ---------- Read: status / longtext / comments ----------

	async getStatus(idOrMblogid: string): Promise<WeiboStatus> {
		return this.get<WeiboStatus>('/ajax/statuses/show', {
			id: idOrMblogid,
		});
	}

	async getLongText(idstr: string): Promise<string | undefined> {
		const data = await this.get<WeiboLongText>('/ajax/statuses/longtext', {
			id: idstr,
		});
		return data?.longTextContent;
	}

	async getComments(idstr: string, count = 20): Promise<WeiboCommentEntry[]> {
		const data = await this.getRaw<WeiboCommentEntry[]>(
			'/ajax/statuses/buildComments',
			{
				flow: '0',
				is_reload: '1',
				id: idstr,
				is_show_bulletin: '2',
				is_mix: '0',
				count: String(count),
			},
		);
		return data ?? [];
	}

	// ---------- Read: discovery ----------

	async getHot(): Promise<WeiboHotItem[]> {
		const data = await this.get<{band_list?: WeiboHotBandRaw[]}>(
			'/ajax/statuses/hot_band',
		);
		const list = data?.band_list ?? [];
		return list.map((item, index) => ({
			rank: item.realpos ?? index + 1,
			word: item.word ?? '',
			hot_value: item.num ?? 0,
			category: item.category ?? '',
			label: item.label_name ?? '',
			url:
				'https://s.weibo.com/weibo?q=' +
				encodeURIComponent('#' + (item.word ?? '') + '#'),
		}));
	}

	async getFeed(
		kind: WeiboFeedKind = 'for-you',
		count = 20,
	): Promise<WeiboStatus[]> {
		const uid = await this.getMyUid();
		const endpoint = TIMELINE_ENDPOINTS[kind];
		const data = await this.get<{statuses?: WeiboStatus[]}>(
			`/ajax/feed/${endpoint}`,
			{
				list_id: '10001' + uid,
				refresh: '4',
				since_id: '0',
				count: String(count),
			},
		);
		return data?.statuses ?? [];
	}

	async getFavorites(page = 1): Promise<WeiboStatus[]> {
		const data = await this.get<{status?: WeiboStatus[]}>(
			'/ajax/favorites/all_fav',
			{page: String(page)},
		);
		return data?.status ?? [];
	}

	// ---------- Read: user ----------

	async getUser(query: {
		uid?: string;
		screenName?: string;
	}): Promise<WeiboUser> {
		const parameters: Record<string, string> = {};
		if (query.uid) parameters.uid = query.uid;
		if (query.screenName) parameters.screen_name = query.screenName;

		const data = await this.get<{user?: WeiboUser}>(
			'/ajax/profile/info',
			parameters,
		);
		const user = data?.user;
		if (!user) {
			throw new CliError('未找到该用户', ExitCode.DATA_ERR);
		}

		return user;
	}

	async getUserDetail(uid: string): Promise<WeiboUserDetail> {
		return this.get<WeiboUserDetail>('/ajax/profile/detail', {uid});
	}

	async getUserPosts(uid: string, page = 1): Promise<WeiboStatus[]> {
		const data = await this.get<{list?: WeiboStatus[]}>(
			'/ajax/statuses/mymblog',
			{
				uid,
				page: String(page),
				feature: '0',
			},
		);
		return data?.list ?? [];
	}

	async getFollowers(uid: string, page = 1): Promise<WeiboUser[]> {
		const data = await this.get<{users?: WeiboUser[]}>(
			'/ajax/friendships/friends',
			{
				uid,
				relate: 'fans',
				page: String(page),
				type: 'fans',
			},
		);
		return data?.users ?? [];
	}

	async getFollowing(uid: string, page = 1): Promise<WeiboUser[]> {
		const data = await this.get<{users?: WeiboUser[]}>(
			'/ajax/friendships/friends',
			{
				uid,
				page: String(page),
			},
		);
		return data?.users ?? [];
	}

	// ---------- Read: search (DOM scrape) ----------

	async search(keyword: string, limit = 20): Promise<WeiboSearchResult[]> {
		await this.throttle();

		const url = `${searchBase}/weibo?q=${encodeURIComponent(
			keyword,
		)}&Refer=weibo_weibo`;
		const resp = await fetch(url, {
			headers: {
				...getWeiboHeaders(this.cookieStore.getCookieString()),
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				Referer: 'https://s.weibo.com/',
			},
		});

		if (!resp.ok) {
			throw new CliError(
				`微博搜索失败: ${resp.status}`,
				resp.status >= 500 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
			);
		}

		const html = await resp.text();
		const $ = cheerio.load(html);
		const results: WeiboSearchResult[] = [];

		$('.card-wrap').each((_, element) => {
			if (results.length >= limit) return false;

			const $card = $(element);
			const mid = $card.attr('mid') ?? '';
			if (!mid) return undefined;

			const $content = $card
				.find('[node-type="feed_list_content_full"]')
				.first().length
				? $card.find('[node-type="feed_list_content_full"]').first()
				: $card.find('[node-type="feed_list_content"]').first();

			const text = $content.text().trim().replace(/\s+/g, ' ');
			const screenName = $card.find('.info .name').first().text().trim();
			const userHref = $card.find('.info .name').first().attr('href') ?? '';
			const fromAnchor = $card
				.find('.from a')
				.filter((_index, anchor) => {
					const href = $(anchor).attr('href') ?? '';
					return /\/(detail|status)\//.test(href);
				})
				.first();
			const detailHref = fromAnchor.attr('href') ?? '';

			results.push({
				mid,
				url: detailHref ? normalizeUrl(detailHref) : undefined,
				user_screen_name: screenName,
				user_url: userHref ? normalizeUrl(userHref) : undefined,
				text,
				source: $card.find('.from a').last().text().trim() || undefined,
			});

			return undefined;
		});

		return results;
	}

	// ---------- Write: like / unlike / repost / comment / delete ----------

	async like(idstr: string): Promise<WeiboInteractResult> {
		await this.post('/ajax/like/update', {
			id: idstr,
			attitude: 'heart',
			st: this.cookieStore.getCsrf(),
		});
		return {success: true, action: 'like', target: idstr};
	}

	async unlike(idstr: string): Promise<WeiboInteractResult> {
		await this.post('/ajax/like/update', {
			id: idstr,
			attitude: 'none',
			st: this.cookieStore.getCsrf(),
		});
		return {success: true, action: 'unlike', target: idstr};
	}

	async repost(
		idstr: string,
		mid: string,
		comment = '转发微博',
	): Promise<WeiboInteractResult> {
		await this.post('/ajax/statuses/repost', {
			id: idstr,
			mid,
			content: comment,
			dualPost: '0',
			st: this.cookieStore.getCsrf(),
		});
		return {success: true, action: 'repost', target: idstr};
	}

	async comment(
		idstr: string,
		mid: string,
		text: string,
	): Promise<WeiboInteractResult> {
		await this.post('/ajax/comments/create', {
			id: idstr,
			mid,
			comment: text,
			st: this.cookieStore.getCsrf(),
		});
		return {success: true, action: 'comment', target: idstr};
	}

	async destroy(mid: string): Promise<WeiboInteractResult> {
		await this.post('/ajax/statuses/destroy', {
			mid,
			st: this.cookieStore.getCsrf(),
		});
		return {success: true, action: 'delete', target: mid};
	}

	async follow(uid: string): Promise<WeiboInteractResult> {
		await this.post('/ajax/profile/followCreate', {
			uid,
			st: this.cookieStore.getCsrf(),
		});
		return {success: true, action: 'follow', target: uid};
	}

	async unfollow(uid: string): Promise<WeiboInteractResult> {
		await this.post('/ajax/profile/followDestroy', {
			uid,
			st: this.cookieStore.getCsrf(),
		});
		return {success: true, action: 'unfollow', target: uid};
	}

	// ---------- Write: publish ----------

	async publishStatus(
		text: string,
		picIds: string[] = [],
	): Promise<WeiboPublishResult> {
		const body: Record<string, string> = {
			content: text,
			st: this.cookieStore.getCsrf(),
			visible: '0',
		};
		if (picIds.length > 0) {
			body.picId = picIds.join(',');
		}

		const data = await this.postJson<WeiboStatus>(
			'/ajax/statuses/update',
			body,
		);

		return {
			mid: data.mid,
			idstr: data.idstr,
			mblogid: data.mblogid,
			url:
				data.user?.idstr && (data.mblogid ?? data.idstr)
					? `https://weibo.com/${data.user.idstr}/${data.mblogid ?? data.idstr}`
					: `https://m.weibo.cn/status/${data.idstr}`,
		};
	}

	// ---------- Internal helpers ----------

	private async get<T>(
		endpoint: string,
		parameters?: Record<string, string>,
	): Promise<T> {
		await this.throttle();

		const url = new URL(`${weiboApiBase}${endpoint}`);
		if (parameters) {
			for (const [k, v] of Object.entries(parameters)) {
				url.searchParams.set(k, v);
			}
		}

		const resp = await fetch(url.toString(), {
			headers: getWeiboHeaders(this.cookieStore.getCookieString()),
		});

		if (resp.status === 401 || resp.status === 403) {
			throw new CliError(
				'未登录或登录已过期，请重新运行 "zget weibo login"',
				ExitCode.NOPERM,
				'运行 zget weibo login',
			);
		}

		if (!resp.ok) {
			throw new CliError(
				`Weibo API error: ${resp.status} ${resp.statusText}`,
				resp.status >= 500 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
			);
		}

		const json = (await resp.json()) as WeiboApiResponse<T>;
		if (Number(json.ok) !== 1) {
			throw new CliError(
				`Weibo API error: ${json.msg ?? 'unknown'}`,
				ExitCode.PROTOCOL,
			);
		}

		return json.data as T;
	}

	private async getRaw<T>(
		endpoint: string,
		parameters?: Record<string, string>,
	): Promise<T | undefined> {
		// Some endpoints (e.g. buildComments) return {ok, data:[]} where data is the array directly
		await this.throttle();

		const url = new URL(`${weiboApiBase}${endpoint}`);
		if (parameters) {
			for (const [k, v] of Object.entries(parameters)) {
				url.searchParams.set(k, v);
			}
		}

		const resp = await fetch(url.toString(), {
			headers: getWeiboHeaders(this.cookieStore.getCookieString()),
		});

		if (!resp.ok) {
			throw new CliError(
				`Weibo API error: ${resp.status} ${resp.statusText}`,
				resp.status >= 500 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
			);
		}

		const json = (await resp.json()) as {ok?: number; data?: T};
		if (Number(json.ok) !== 1) {
			throw new CliError(`Weibo API error: ok=${json.ok}`, ExitCode.PROTOCOL);
		}

		return json.data;
	}

	private async post(
		endpoint: string,
		body: Record<string, string>,
	): Promise<void> {
		await this.postJson<unknown>(endpoint, body);
	}

	private async postJson<T>(
		endpoint: string,
		body: Record<string, string>,
	): Promise<T> {
		await this.throttle();

		if (!this.cookieStore.isAuthenticated()) {
			throw new CliError(
				'未登录，请先运行 "zget weibo login"',
				ExitCode.NOPERM,
				'运行 zget weibo login',
			);
		}

		const csrf = this.cookieStore.getCsrf();
		if (!csrf) {
			throw new CliError(
				'缺少 XSRF-TOKEN，请重新运行 "zget weibo login"',
				ExitCode.NOPERM,
				'运行 zget weibo login',
			);
		}

		const resp = await fetch(`${weiboApiBase}${endpoint}`, {
			method: 'POST',
			headers: {
				...getWeiboHeaders(this.cookieStore.getCookieString(), csrf),
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(body).toString(),
		});

		if (resp.status === 401 || resp.status === 403) {
			throw new CliError(
				'未登录或登录已过期，请重新运行 "zget weibo login"',
				ExitCode.NOPERM,
				'运行 zget weibo login',
			);
		}

		if (!resp.ok) {
			throw new CliError(
				`Weibo API error: ${resp.status} ${resp.statusText}`,
				resp.status >= 500 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
			);
		}

		const json = (await resp.json()) as WeiboApiResponse<T>;
		if (Number(json.ok) !== 1) {
			throw new CliError(
				`Weibo 操作失败: ${json.msg ?? 'unknown'}`,
				ExitCode.PROTOCOL,
			);
		}

		return (json.data ?? ({} as T)) as T;
	}

	private async throttle(): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		if (elapsed < this.throttleMs) {
			await new Promise<void>(resolve => {
				setTimeout(resolve, this.throttleMs - elapsed);
			});
		}

		this.lastRequestTime = Date.now();
	}
}

function normalizeUrl(href: string): string {
	if (href.startsWith('//')) return `https:${href}`;
	if (href.startsWith('http')) return href;
	if (href.startsWith('/')) return `https://weibo.com${href}`;
	return href;
}
