import {readFile, writeFile, chmod} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {cookieFile, ensureConfigDir} from '../utils/config';

type CookieData = {
	cookies: Record<string, string>;
};

const requiredCookies = new Set(['z_c0', '_xsrf', 'd_c0']);

export class CookieStore {
	private cookies: Record<string, string> = {};

	async load(): Promise<boolean> {
		if (!existsSync(cookieFile)) {
			return false;
		}

		try {
			const raw = await readFile(cookieFile, 'utf8');
			const data = JSON.parse(raw) as CookieData;
			this.cookies = data.cookies ?? {};
			return this.isAuthenticated();
		} catch {
			return false;
		}
	}

	async save(): Promise<void> {
		await ensureConfigDir();
		const data: CookieData = {cookies: this.cookies};
		await writeFile(cookieFile, JSON.stringify(data, null, 2), 'utf8');
		try {
			await chmod(cookieFile, 0o600);
		} catch {
			// Windows may not support chmod
		}
	}

	isAuthenticated(): boolean {
		return [...requiredCookies].every(key => Boolean(this.cookies[key]));
	}

	get(key: string): string | undefined {
		return this.cookies[key];
	}

	set(key: string, value: string): void {
		this.cookies[key] = value;
	}

	getAll(): Record<string, string> {
		return {...this.cookies};
	}

	getCookieString(): string {
		return Object.entries(this.cookies)
			.map(([k, v]) => `${k}=${v}`)
			.join('; ');
	}

	getXsrfToken(): string | undefined {
		return this.cookies._xsrf;
	}

	parseCookieString(cookieString: string): void {
		for (const item of cookieString.split(';')) {
			const trimmed = item.trim();
			if (trimmed.includes('=')) {
				const [key, ...rest] = trimmed.split('=');
				if (key) {
					this.cookies[key.trim()] = rest.join('=').trim();
				}
			}
		}
	}

	clear(): void {
		this.cookies = {};
	}
}
