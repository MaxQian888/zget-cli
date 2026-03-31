import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {XhsCookies, XhsTokenEntry} from '../api/xhs-types';
import {xhsCookieFile, xhsTokenFile} from '../utils/config';

export class XhsCookieStore {
	private cookies: XhsCookies = {};

	async load(): Promise<void> {
		try {
			const content = await readFile(xhsCookieFile, 'utf8');
			this.cookies = JSON.parse(content) as XhsCookies;
		} catch {
			// No cookies found
		}
	}

	async save(): Promise<void> {
		await mkdir(dirname(xhsCookieFile), {recursive: true});
		await writeFile(xhsCookieFile, JSON.stringify(this.cookies, null, 2));
	}

	setCookies(cookies: XhsCookies): void {
		this.cookies = {...this.cookies, ...cookies};
	}

	parseCookieString(cookieString: string): void {
		for (const pair of cookieString.split(';')) {
			const [key, ...rest] = pair.trim().split('=');
			if (key && rest.length > 0) {
				this.cookies[key.trim()] = rest.join('=').trim();
			}
		}
	}

	getCookieString(): string {
		return Object.entries(this.cookies)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => `${key}=${value ?? ''}`)
			.join('; ');
	}

	isAuthenticated(): boolean {
		return Boolean(this.cookies.a1 && this.cookies.web_session);
	}

	getCookie(key: string): string | undefined {
		return this.cookies[key];
	}

	clear(): void {
		this.cookies = {};
	}
}

const tokenTtlMs = 30 * 60 * 1000; // 30 minutes

export class XsecTokenCache {
	private tokens: Record<string, XhsTokenEntry> = {};

	async load(): Promise<void> {
		try {
			const content = await readFile(xhsTokenFile, 'utf8');
			this.tokens = JSON.parse(content) as Record<string, XhsTokenEntry>;
		} catch {
			// No cache
		}
	}

	async save(): Promise<void> {
		await mkdir(dirname(xhsTokenFile), {recursive: true});
		await writeFile(xhsTokenFile, JSON.stringify(this.tokens, null, 2));
	}

	get(key: string): string | undefined {
		const entry = this.tokens[key];
		if (!entry) return undefined;
		if (Date.now() - entry.timestamp > tokenTtlMs) {
			delete this.tokens[key]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
			return undefined;
		}

		return entry.token;
	}

	set(key: string, token: string): void {
		this.tokens[key] = {token, timestamp: Date.now()};
	}
}
