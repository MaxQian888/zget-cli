import * as cheerio from 'cheerio';
import type {
	HnAlgoliaResponse,
	HnInteractResult,
	HnItem,
	HnListKind,
	HnSubmitResult,
	HnUser,
} from '../../types/hn';
import {type HnCookieStore} from '../auth/hn-auth';
import {getHnHeaders} from '../utils/headers';
import {CliError, ExitCode} from '../utils/exit-codes';

const firebaseBase = 'https://hacker-news.firebaseio.com/v0';
const algoliaBase = 'https://hn.algolia.com/api/v1';
const siteBase = 'https://news.ycombinator.com';

// Firebase list endpoints — keyed by the user-facing HnListKind.
const listEndpoints: Record<HnListKind, string> = {
	top: '/topstories.json',
	best: '/beststories.json',
	new: '/newstories.json',
	ask: '/askstories.json',
	show: '/showstories.json',
	job: '/jobstories.json',
	updates: '/updates.json',
};

export class HnApi {
	private lastRequestTime = 0;

	constructor(private readonly cookieStore?: HnCookieStore) {}

	// --- Read: items ---

	async getItem(id: number | string): Promise<HnItem> {
		const data = await this.getJson<HnItem | undefined>(
			`${firebaseBase}/item/${String(id)}.json`,
		);
		if (!data) {
			throw new CliError(
				`未找到 HN item: ${String(id)}`,
				ExitCode.DATA_ERR,
				'确认 ID 是否存在: news.ycombinator.com/item?id=' + String(id),
			);
		}

		return data;
	}

	async getUser(username: string): Promise<HnUser> {
		const data = await this.getJson<HnUser | undefined>(
			`${firebaseBase}/user/${encodeURIComponent(username)}.json`,
		);
		if (!data) {
			throw new CliError(`未找到 HN 用户: ${username}`, ExitCode.DATA_ERR);
		}

		return data;
	}

	// --- Read: lists ---

	async getList(kind: HnListKind, limit = 30): Promise<HnItem[]> {
		const endpoint = listEndpoints[kind];
		const ids = await this.getJson<number[]>(`${firebaseBase}${endpoint}`);
		const sliced = ids.slice(0, limit);
		const items = await Promise.all(sliced.map(async id => this.getItem(id)));
		return items;
	}

	async getTopStories(limit = 30): Promise<HnItem[]> {
		return this.getList('top', limit);
	}

	async getBestStories(limit = 30): Promise<HnItem[]> {
		return this.getList('best', limit);
	}

	async getNewStories(limit = 30): Promise<HnItem[]> {
		return this.getList('new', limit);
	}

	async getAskStories(limit = 30): Promise<HnItem[]> {
		return this.getList('ask', limit);
	}

	async getShowStories(limit = 30): Promise<HnItem[]> {
		return this.getList('show', limit);
	}

	async getJobStories(limit = 30): Promise<HnItem[]> {
		return this.getList('job', limit);
	}

	// Comments: recursively load the kid tree up to a max depth and per-level fan-out.
	async getComments(
		itemId: number | string,
		options: {maxDepth?: number; perLevel?: number} = {},
	): Promise<HnItem[]> {
		const maxDepth = options.maxDepth ?? 3;
		const perLevel = options.perLevel ?? 30;
		const root = await this.getItem(itemId);
		const out: HnItem[] = [];

		const walk = async (parent: HnItem, depth: number): Promise<void> => {
			if (depth > maxDepth) return;
			const kids = (parent.kids ?? []).slice(0, perLevel);
			for (const id of kids) {
				try {
					// eslint-disable-next-line no-await-in-loop
					const kid = await this.getItem(id);
					if (kid.deleted === true || kid.dead === true) continue;
					out.push(kid);
					// eslint-disable-next-line no-await-in-loop
					await walk(kid, depth + 1);
				} catch {
					// Skip broken kids; comment trees on HN can have referenced-but-missing items.
				}
			}
		};

		await walk(root, 1);
		return out;
	}

	// --- Read: Algolia search ---

	async search(
		query: string,
		options: {tags?: string; hitsPerPage?: number; page?: number} = {},
	): Promise<HnAlgoliaResponse> {
		const url = new URL(`${algoliaBase}/search`);
		url.searchParams.set('query', query);
		if (options.tags) url.searchParams.set('tags', options.tags);
		url.searchParams.set('hitsPerPage', String(options.hitsPerPage ?? 30));
		if (options.page !== undefined) {
			url.searchParams.set('page', String(options.page));
		}

		const data = await this.getJson<HnAlgoliaResponse>(url.toString());
		return data;
	}

	async searchByDate(
		query: string,
		options: {tags?: string; hitsPerPage?: number; page?: number} = {},
	): Promise<HnAlgoliaResponse> {
		const url = new URL(`${algoliaBase}/search_by_date`);
		url.searchParams.set('query', query);
		if (options.tags) url.searchParams.set('tags', options.tags);
		url.searchParams.set('hitsPerPage', String(options.hitsPerPage ?? 30));
		if (options.page !== undefined) {
			url.searchParams.set('page', String(options.page));
		}

		const data = await this.getJson<HnAlgoliaResponse>(url.toString());
		return data;
	}

	// --- Read: self ---

	async getMyProfile(): Promise<HnUser> {
		const username = this.requireCookieStore().getUsername();
		if (!username) {
			throw new CliError(
				'未登录，请先运行 "zget hn login"',
				ExitCode.NOPERM,
				'zget hn login',
			);
		}

		return this.getUser(username);
	}

	// --- Write: vote / fave / submit / comment / delete ---
	//
	// HN write endpoints expect a form POST with `id` + `auth` (scraped from the
	// item page, since the token is per-user per-item) + a cookie session.

	async upvote(itemId: number | string): Promise<HnInteractResult> {
		this.requireCookieStore();
		await this.voteAction(itemId, 'up');
		return {success: true, action: 'upvote', target: String(itemId)};
	}

	async unvote(itemId: number | string): Promise<HnInteractResult> {
		this.requireCookieStore();
		await this.voteAction(itemId, 'un');
		return {success: true, action: 'unvote', target: String(itemId)};
	}

	async favorite(itemId: number | string): Promise<HnInteractResult> {
		this.requireCookieStore();
		await this.faveAction(itemId, false);
		return {success: true, action: 'favorite', target: String(itemId)};
	}

	async unfavorite(itemId: number | string): Promise<HnInteractResult> {
		this.requireCookieStore();
		await this.faveAction(itemId, true);
		return {success: true, action: 'unfavorite', target: String(itemId)};
	}

	async comment(
		itemId: number | string,
		text: string,
	): Promise<HnInteractResult> {
		if (!text.trim()) {
			throw new CliError('Comment text is empty', ExitCode.USAGE);
		}

		this.requireCookieStore();
		const auth = await this.fetchAuthForItem(itemId);
		const body = new URLSearchParams({
			parent: String(itemId),
			goto: `item?id=${String(itemId)}`,
			hmac: auth.commentHmac ?? '',
			text,
		});

		await this.postForm(`${siteBase}/comment`, body);
		return {success: true, action: 'comment', target: String(itemId)};
	}

	async submit(
		title: string,
		urlOrText: string,
		options: {asText?: boolean} = {},
	): Promise<HnSubmitResult> {
		if (!title.trim()) {
			throw new CliError('Submit requires --text <title>', ExitCode.USAGE);
		}

		this.requireCookieStore();
		const submitPage = await this.fetchAuthForSubmit();
		const body = new URLSearchParams({
			fnid: submitPage.fnid,
			fnop: 'submit-page',
			title,
		});
		if (options.asText) {
			body.set('text', urlOrText);
			body.set('url', '');
		} else {
			body.set('url', urlOrText);
			body.set('text', '');
		}

		const responseUrl = await this.postForm(`${siteBase}/r`, body, true);
		const idMatch = /item\?id=(\d+)/.exec(responseUrl ?? '');
		return {
			itemId: idMatch ? Number(idMatch[1]) : undefined,
			url: responseUrl ?? `${siteBase}/newest`,
		};
	}

	async delete(itemId: number | string): Promise<HnInteractResult> {
		this.requireCookieStore();
		const auth = await this.fetchAuthForItem(itemId);
		if (!auth.deleteAuth) {
			throw new CliError(
				`Cannot delete item ${String(
					itemId,
				)} — no delete token visible (item not yours, or too old).`,
				ExitCode.NOPERM,
			);
		}

		const body = new URLSearchParams({
			id: String(itemId),
			auth: auth.deleteAuth,
			d: 'Yes',
			goto: 'news',
		});
		await this.postForm(`${siteBase}/xdelete`, body);
		return {success: true, action: 'delete', target: String(itemId)};
	}

	// --- Internal: HTTP helpers ---

	private async getJson<T>(url: string): Promise<T> {
		await this.throttle();

		const resp = await fetch(url, {
			headers: getHnHeaders(),
		});

		if (!resp.ok) {
			if (resp.status === 404) {
				throw new CliError(`HN 404: ${url}`, ExitCode.DATA_ERR);
			}

			throw new CliError(
				`HN API error: ${resp.status} ${resp.statusText}`,
				resp.status >= 500 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
			);
		}

		return (await resp.json()) as T;
	}

	private async getHtml(url: string): Promise<string> {
		await this.throttle();

		const resp = await fetch(url, {
			headers: getHnHeaders(this.cookieStore?.getCookieString()),
		});

		if (!resp.ok) {
			throw new CliError(
				`HN HTML error: ${resp.status} ${resp.statusText}`,
				resp.status >= 500 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
			);
		}

		return resp.text();
	}

	private async postForm(
		url: string,
		body: URLSearchParams,
		followRedirect = false,
	): Promise<string | undefined> {
		this.requireCookieStore();
		await this.throttle();

		const resp = await fetch(url, {
			method: 'POST',
			headers: {
				...getHnHeaders(this.cookieStore?.getCookieString()),
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: body.toString(),
			redirect: followRedirect ? 'follow' : 'manual',
		});

		// HN responds with 302 on success for actions; redirect target is the
		// landing page. Treat any 2xx/3xx as success.
		if (resp.status >= 400) {
			throw new CliError(
				`HN write failed: ${resp.status} ${resp.statusText}`,
				resp.status === 403 || resp.status === 401
					? ExitCode.NOPERM
					: ExitCode.PROTOCOL,
			);
		}

		return resp.headers.get('location') ?? resp.url;
	}

	private async throttle(): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		const minGap = 300;
		if (elapsed < minGap) {
			await new Promise<void>(resolve => {
				setTimeout(resolve, minGap - elapsed);
			});
		}

		this.lastRequestTime = Date.now();
	}

	private requireCookieStore(): HnCookieStore {
		if (!this.cookieStore?.isAuthenticated()) {
			throw new CliError(
				'未登录，请先运行 "zget hn login"',
				ExitCode.NOPERM,
				'zget hn login',
			);
		}

		return this.cookieStore;
	}

	// --- Internal: scraping the per-item auth/hmac tokens ---

	private async voteAction(
		itemId: number | string,
		how: 'up' | 'un',
	): Promise<void> {
		const auth = await this.fetchAuthForItem(itemId);
		const voteAuth = how === 'up' ? auth.upvoteAuth : auth.unvoteAuth;
		if (!voteAuth) {
			throw new CliError(
				`Cannot ${how}vote item ${String(
					itemId,
				)} — no ${how}vote token visible.`,
				ExitCode.NOPERM,
			);
		}

		const body = new URLSearchParams({
			id: String(itemId),
			how,
			auth: voteAuth,
			goto: `item?id=${String(itemId)}`,
		});
		await this.postForm(`${siteBase}/vote`, body);
	}

	private async faveAction(
		itemId: number | string,
		undo: boolean,
	): Promise<void> {
		const auth = await this.fetchAuthForItem(itemId);
		const tokenName = undo ? 'unfaveAuth' : 'faveAuth';
		const token = auth[tokenName];
		if (!token) {
			throw new CliError(
				`Cannot ${undo ? 'un' : ''}favorite item ${String(
					itemId,
				)} — no token visible.`,
				ExitCode.NOPERM,
			);
		}

		const body = new URLSearchParams({
			id: String(itemId),
			auth: token,
			...(undo ? {un: 't'} : {}),
		});
		await this.postForm(`${siteBase}/fave`, body);
	}

	private async fetchAuthForItem(itemId: number | string): Promise<{
		upvoteAuth?: string;
		unvoteAuth?: string;
		faveAuth?: string;
		unfaveAuth?: string;
		deleteAuth?: string;
		commentHmac?: string;
	}> {
		const html = await this.getHtml(`${siteBase}/item?id=${String(itemId)}`);
		const $ = cheerio.load(html);

		const tokens: Record<string, string | undefined> = {};

		// Upvote arrow: <a href="vote?id=X&how=up&auth=...">
		const upHref = $(`#up_${String(itemId)}`).attr('href');
		const unHref = $(`#un_${String(itemId)}`).attr('href');
		if (upHref)
			tokens.upvoteAuth =
				new URL(upHref, siteBase).searchParams.get('auth') ?? undefined;
		if (unHref)
			tokens.unvoteAuth =
				new URL(unHref, siteBase).searchParams.get('auth') ?? undefined;

		// Fave / unfave links live in the item's subtext
		$('a').each((_, element) => {
			const href = $(element).attr('href') ?? '';
			if (href.startsWith('fave?')) {
				const url = new URL(href, siteBase);
				if (url.searchParams.get('un')) {
					tokens.unfaveAuth = url.searchParams.get('auth') ?? undefined;
				} else {
					tokens.faveAuth = url.searchParams.get('auth') ?? undefined;
				}
			} else if (href.startsWith('xdelete?')) {
				const url = new URL(href, siteBase);
				tokens.deleteAuth = url.searchParams.get('auth') ?? undefined;
			}
		});

		// Comment form hmac
		const hmac = $('input[name="hmac"]').first().attr('value');
		if (hmac) tokens.commentHmac = hmac;

		return tokens;
	}

	private async fetchAuthForSubmit(): Promise<{fnid: string}> {
		const html = await this.getHtml(`${siteBase}/submit`);
		const $ = cheerio.load(html);
		const fnid = $('input[name="fnid"]').attr('value');
		if (!fnid) {
			throw new CliError(
				'无法获取 submit fnid，登录可能已失效',
				ExitCode.NOPERM,
				'zget hn login',
			);
		}

		return {fnid};
	}
}
