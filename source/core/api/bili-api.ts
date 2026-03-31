import {createHash} from 'node:crypto';
import type {
	BiliApiResponse,
	BiliVideoInfo,
	BiliSubtitleInfo,
	BiliSubtitleContent,
	BiliComment,
	BiliSearchResult,
	BiliUserInfo,
	BiliUserVideo,
	BiliRankingItem,
	BiliRelatedVideo,
} from '../../types/bilibili';
import {type BiliCookieStore} from '../auth/bili-auth';
import {getBiliHeaders} from '../utils/headers';

const biliApiBase = 'https://api.bilibili.com';

// WBI signing mixin key table
const mixinKeyEncodingTable = [
	46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
	33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
	26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
	20, 34, 44, 52,
];
const selectLikeKey = 'select_like';
const wRidKey = 'w_rid';

export class BiliApi {
	private lastRequestTime = 0;
	private wbiKeys: {imgKey: string; subKey: string} | undefined;

	constructor(private readonly cookieStore: BiliCookieStore) {}

	// --- Read operations ---

	async getVideoInfo(bvid: string): Promise<BiliVideoInfo> {
		const data = await this.get<BiliVideoInfo>('/x/web-interface/view', {bvid});
		return data;
	}

	async getSubtitles(bvid: string): Promise<BiliSubtitleContent | undefined> {
		// First get video info to find cid
		const videoInfo = await this.getVideoInfo(bvid);
		const {cid} = videoInfo;

		// Get player info which contains subtitle list
		const playerData = await this.get<{
			subtitle: {subtitles: BiliSubtitleInfo[]};
		}>('/x/player/v2', {bvid, cid: String(cid)});

		const subtitles = playerData?.subtitle?.subtitles;
		if (!subtitles || subtitles.length === 0) {
			return undefined;
		}

		// Prefer Chinese subtitles
		const zhSub =
			subtitles.find(s => s.lan.startsWith('zh')) ??
			subtitles.find(s => s.lan === 'ai-zh') ??
			subtitles[0];

		if (!zhSub) return undefined;

		// Fetch the actual subtitle content
		let subtitleUrl = zhSub.subtitle_url;
		if (subtitleUrl.startsWith('//')) {
			subtitleUrl = `https:${subtitleUrl}`;
		}

		const resp = await fetch(subtitleUrl, {
			headers: getBiliHeaders(this.cookieStore.getCookieString()),
		});

		if (!resp.ok) return undefined;

		const content = (await resp.json()) as BiliSubtitleContent;
		return content;
	}

	async getComments(bvid: string, pageNumber = 1): Promise<BiliComment[]> {
		// Need aid for comments API
		const videoInfo = await this.getVideoInfo(bvid);
		const oid = videoInfo.aid;

		const data = await this.get<{replies: BiliComment[] | undefined}>(
			'/x/v2/reply/main',
			{
				oid: String(oid),
				type: '1',
				mode: '3',
				pn: String(pageNumber),
				ps: '20',
			},
		);

		return data?.replies ?? [];
	}

	async search(keyword: string, page = 1): Promise<BiliSearchResult[]> {
		const data = await this.get<{result: Array<{data?: BiliSearchResult[]}>}>(
			'/x/web-interface/search/all/v2',
			{
				keyword,
				page: String(page),
			},
		);

		// Video results are in a nested structure
		const videoResult = data?.result?.find(
			(r: Record<string, unknown>) => r.result_type === 'video' || r.data,
		);
		return videoResult?.data ?? [];
	}

	async getHotVideos(): Promise<BiliRankingItem[]> {
		const data = await this.get<{list: BiliRankingItem[]}>(
			'/x/web-interface/popular',
			{
				ps: '20',
				pn: '1',
			},
		);
		return data?.list ?? [];
	}

	async getRanking(rid = 0): Promise<BiliRankingItem[]> {
		const data = await this.get<{list: BiliRankingItem[]}>(
			'/x/web-interface/ranking/v2',
			{
				rid: String(rid),
				type: 'all',
			},
		);
		return data?.list ?? [];
	}

	async getUserInfo(mid: string): Promise<BiliUserInfo> {
		const data = await this.get<BiliUserInfo>('/x/space/wbi/acc/info', {mid});

		// Also get follower count from relation stat
		try {
			const statData = await this.get<{follower: number; following: number}>(
				'/x/relation/stat',
				{vmid: mid},
			);
			if (statData) {
				data.follower = statData.follower;
				data.following = statData.following;
			}
		} catch {
			// Non-critical
		}

		return data;
	}

	async getUserVideos(
		mid: string,
		page = 1,
	): Promise<{list: {vlist: BiliUserVideo[]}; page: {count: number}}> {
		// This endpoint requires WBI signing
		const parameters: Record<string, string> = {
			mid,
			ps: '20',
			pn: String(page),
			order: 'pubdate',
		};

		const signedParameters = await this.signWbi(parameters);
		const data = await this.get<{
			list: {vlist: BiliUserVideo[]};
			page: {count: number};
		}>('/x/space/wbi/arc/search', signedParameters);
		return data;
	}

	async getRelatedVideos(bvid: string): Promise<BiliRelatedVideo[]> {
		const data = await this.get<BiliRelatedVideo[]>(
			'/x/web-interface/archive/related',
			{bvid},
		);
		return data ?? [];
	}

	// --- Write operations ---

	async likeVideo(bvid: string, like = true): Promise<void> {
		await this.post('/x/web-interface/archive/like', {
			bvid,
			like: like ? '1' : '2',
			csrf: this.cookieStore.getCsrf(),
		});
	}

	async coinVideo(bvid: string, multiply = 1): Promise<void> {
		await this.post('/x/web-interface/coin/add', {
			bvid,
			multiply: String(multiply),
			[selectLikeKey]: '0',
			csrf: this.cookieStore.getCsrf(),
		});
	}

	async tripleVideo(bvid: string): Promise<void> {
		await this.post('/x/web-interface/archive/like/triple', {
			bvid,
			csrf: this.cookieStore.getCsrf(),
		});
	}

	async getMyInfo(): Promise<BiliUserInfo> {
		const data = await this.get<BiliUserInfo>('/x/space/myinfo');
		return data;
	}

	// --- Internal helpers ---

	private async get<T>(
		endpoint: string,
		parameters?: Record<string, string>,
	): Promise<T> {
		await this.throttle();

		const url = new URL(`${biliApiBase}${endpoint}`);
		if (parameters) {
			for (const [k, v] of Object.entries(parameters)) {
				url.searchParams.set(k, v);
			}
		}

		const resp = await fetch(url.toString(), {
			headers: getBiliHeaders(this.cookieStore.getCookieString()),
		});

		if (!resp.ok) {
			throw new Error(`Bilibili API error: ${resp.status} ${resp.statusText}`);
		}

		const json = (await resp.json()) as BiliApiResponse<T>;
		if (json.code !== 0) {
			throw new Error(`Bilibili API error (${json.code}): ${json.message}`);
		}

		return json.data;
	}

	private async post(
		endpoint: string,
		data: Record<string, string>,
	): Promise<void> {
		await this.throttle();

		if (!this.cookieStore.isAuthenticated()) {
			throw new Error('未登录，请先运行 "zget bili login"');
		}

		const resp = await fetch(`${biliApiBase}${endpoint}`, {
			method: 'POST',
			headers: {
				...getBiliHeaders(this.cookieStore.getCookieString()),
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(data).toString(),
		});

		if (!resp.ok) {
			throw new Error(`Bilibili API error: ${resp.status} ${resp.statusText}`);
		}

		const json = (await resp.json()) as BiliApiResponse<unknown>;
		if (json.code !== 0) {
			throw new Error(`Bilibili API error (${json.code}): ${json.message}`);
		}
	}

	private async throttle(): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		if (elapsed < 500) {
			await new Promise<void>(resolve => {
				setTimeout(resolve, 500 - elapsed);
			});
		}

		this.lastRequestTime = Date.now();
	}

	// --- WBI Signing ---

	private async getWbiKeys(): Promise<{imgKey: string; subKey: string}> {
		if (this.wbiKeys) return this.wbiKeys;

		const resp = await fetch(`${biliApiBase}/x/web-interface/nav`, {
			headers: getBiliHeaders(this.cookieStore.getCookieString()),
		});

		const json = (await resp.json()) as BiliApiResponse<{
			wbi_img: {img_url: string; sub_url: string};
		}>;
		const wbiImg = json.data?.wbi_img;

		if (!wbiImg) {
			throw new Error('Failed to get WBI keys');
		}

		// Extract key from URL: the filename without extension
		const imgKey = wbiImg.img_url.split('/').pop()!.split('.')[0]!;
		const subKey = wbiImg.sub_url.split('/').pop()!.split('.')[0]!;

		this.wbiKeys = {imgKey, subKey};
		return this.wbiKeys;
	}

	private async signWbi(
		parameters: Record<string, string>,
	): Promise<Record<string, string>> {
		const {imgKey, subKey} = await this.getWbiKeys();

		// Generate mixin key
		const rawKey = imgKey + subKey;
		const mixinKey = mixinKeyEncodingTable
			.map(i => rawKey[i])
			.join('')
			.slice(0, 32);

		// Add wts (timestamp)
		const wts = Math.floor(Date.now() / 1000);
		const signedParameters = {...parameters, wts: String(wts)};

		// Sort params and create query string
		const sortedEntries = Object.entries(signedParameters).sort(([a], [b]) =>
			a.localeCompare(b),
		);
		const queryString = sortedEntries
			.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
			.join('&');

		// Calculate w_rid (MD5 of query + mixin key)
		const wRid = createHash('md5')
			.update(queryString + mixinKey)
			.digest('hex');

		return {...signedParameters, [wRidKey]: wRid};
	}
}
