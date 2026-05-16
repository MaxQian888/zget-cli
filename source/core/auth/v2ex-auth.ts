import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {V2exToken} from '../../types/v2ex';
import {v2exTokenFile} from '../utils/config';

export class V2exTokenStore {
	private token: string | undefined;

	async load(): Promise<void> {
		try {
			const content = await readFile(v2exTokenFile, 'utf8');
			const parsed = JSON.parse(content) as V2exToken;
			this.token = parsed.token;
		} catch {
			// No token file
		}
	}

	async save(): Promise<void> {
		await mkdir(dirname(v2exTokenFile), {recursive: true});
		await writeFile(
			v2exTokenFile,
			JSON.stringify({token: this.token ?? ''}, null, 2),
		);
	}

	setToken(token: string): void {
		this.token = token.trim();
	}

	getToken(): string | undefined {
		return this.token && this.token.length > 0 ? this.token : undefined;
	}

	isAuthenticated(): boolean {
		return Boolean(this.token && this.token.length > 0);
	}

	clear(): void {
		this.token = undefined;
	}
}
