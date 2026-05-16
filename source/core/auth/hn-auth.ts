import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {HnCookies} from '../../types/hn';
import {hnCookieFile} from '../utils/config';

export class HnCookieStore {
	private cookies: HnCookies = {};

	async load(): Promise<void> {
		try {
			const content = await readFile(hnCookieFile, 'utf8');
			this.cookies = JSON.parse(content) as HnCookies;
		} catch {
			// No cookies found
		}
	}

	async save(): Promise<void> {
		await mkdir(dirname(hnCookieFile), {recursive: true});
		await writeFile(hnCookieFile, JSON.stringify(this.cookies, null, 2));
	}

	setCookies(cookies: HnCookies): void {
		this.cookies = {...this.cookies, ...cookies};
	}

	parseCookieString(cookieString: string): void {
		for (const pair of cookieString.split(';')) {
			const [key, ...rest] = pair.trim().split('=');
			if (key === 'user' && rest.length > 0) {
				this.cookies.user = rest.join('=').trim();
			}
		}
	}

	getCookieString(): string {
		if (!this.cookies.user) return '';
		return `user=${this.cookies.user}`;
	}

	isAuthenticated(): boolean {
		return Boolean(this.cookies.user);
	}

	getUsername(): string | undefined {
		// HN's user cookie format is "<username>&<token>"
		if (!this.cookies.user) return undefined;
		const ampersand = this.cookies.user.indexOf('&');
		return ampersand > 0 ? this.cookies.user.slice(0, ampersand) : undefined;
	}

	clear(): void {
		this.cookies = {};
	}
}
