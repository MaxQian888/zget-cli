// Reddit OAuth2 token-exchange uses snake_case wire params (grant_type,
// refresh_token, access_token…). Mirroring those exactly is simpler than
// re-mapping at every call site.
/* eslint-disable @typescript-eslint/naming-convention */

import {Buffer} from 'node:buffer';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {RedditOauthCreds} from '../../types/reddit';
import {redditCredentialsFile} from '../utils/config';
import {redditUserAgent} from '../utils/headers';

const tokenEndpoint = 'https://www.reddit.com/api/v1/access_token';
// Refresh slightly before the server-side expiry so we don't race a 401.
const expiryGuardMs = 60_000;

export class RedditCredentialStore {
	private creds: RedditOauthCreds = {
		clientId: '',
		clientSecret: '',
		username: '',
	};

	async load(): Promise<void> {
		try {
			const content = await readFile(redditCredentialsFile, 'utf8');
			this.creds = JSON.parse(content) as RedditOauthCreds;
		} catch {
			// No credentials file
		}
	}

	async save(): Promise<void> {
		await mkdir(dirname(redditCredentialsFile), {recursive: true});
		await writeFile(redditCredentialsFile, JSON.stringify(this.creds, null, 2));
	}

	setCredentials(creds: Partial<RedditOauthCreds>): void {
		this.creds = {...this.creds, ...creds};
	}

	getCredentials(): RedditOauthCreds {
		return this.creds;
	}

	getUsername(): string | undefined {
		return this.creds.username || undefined;
	}

	getAccessToken(): string | undefined {
		return this.creds.accessToken;
	}

	isAuthenticated(): boolean {
		return Boolean(
			this.creds.clientId &&
				this.creds.clientSecret &&
				this.creds.username &&
				this.creds.accessToken,
		);
	}

	hasAppCredentials(): boolean {
		return Boolean(
			this.creds.clientId && this.creds.clientSecret && this.creds.username,
		);
	}

	isAccessTokenExpired(): boolean {
		if (!this.creds.tokenExpiresAt) return true;
		return Date.now() >= this.creds.tokenExpiresAt - expiryGuardMs;
	}

	clear(): void {
		this.creds = {clientId: '', clientSecret: '', username: ''};
	}
}

// Performs the OAuth2 "password" grant — Reddit's script-app flow.
// Returns the populated store; caller is responsible for `.save()`.
export async function performRedditPasswordLogin(input: {
	clientId: string;
	clientSecret: string;
	username: string;
	password: string;
}): Promise<RedditCredentialStore> {
	const store = new RedditCredentialStore();
	store.setCredentials({
		clientId: input.clientId,
		clientSecret: input.clientSecret,
		username: input.username,
	});

	const body = new URLSearchParams({
		grant_type: 'password',
		username: input.username,
		password: input.password,
	});

	const resp = await fetch(tokenEndpoint, {
		method: 'POST',
		headers: {
			Authorization:
				'Basic ' +
				Buffer.from(`${input.clientId}:${input.clientSecret}`).toString(
					'base64',
				),
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': redditUserAgent,
		},
		body: body.toString(),
	});

	if (!resp.ok) {
		throw new Error(
			`Reddit token exchange failed: ${resp.status} ${resp.statusText}`,
		);
	}

	const json = (await resp.json()) as {
		access_token?: string;
		refresh_token?: string;
		expires_in?: number;
		error?: string;
	};

	if (json.error !== undefined || !json.access_token) {
		throw new Error(`Reddit token error: ${json.error ?? 'no access_token'}`);
	}

	store.setCredentials({
		accessToken: json.access_token,
		refreshToken: json.refresh_token,
		tokenExpiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
	});

	await store.save();
	return store;
}

// Refreshes the access token using the stored client credentials. Reddit's
// password-grant flow doesn't issue refresh tokens by default, so on expiry
// we re-issue with the saved username + a sidecar password env var, OR fall
// back to client-credentials grant for read-only access.
export async function refreshRedditAccessToken(
	store: RedditCredentialStore,
	password?: string,
): Promise<void> {
	const creds = store.getCredentials();
	if (!creds.clientId || !creds.clientSecret) {
		throw new Error('Reddit credentials missing (no client_id/secret).');
	}

	const body = new URLSearchParams();
	if (creds.refreshToken) {
		body.set('grant_type', 'refresh_token');
		body.set('refresh_token', creds.refreshToken);
	} else if (password && creds.username) {
		body.set('grant_type', 'password');
		body.set('username', creds.username);
		body.set('password', password);
	} else {
		body.set('grant_type', 'client_credentials');
	}

	const resp = await fetch(tokenEndpoint, {
		method: 'POST',
		headers: {
			Authorization:
				'Basic ' +
				Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString(
					'base64',
				),
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': redditUserAgent,
		},
		body: body.toString(),
	});

	if (!resp.ok) {
		throw new Error(`Reddit refresh failed: ${resp.status} ${resp.statusText}`);
	}

	const json = (await resp.json()) as {
		access_token?: string;
		refresh_token?: string;
		expires_in?: number;
	};

	if (!json.access_token) {
		throw new Error('Reddit refresh: no access_token in response');
	}

	store.setCredentials({
		accessToken: json.access_token,
		refreshToken: json.refresh_token ?? creds.refreshToken,
		tokenExpiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
	});

	await store.save();
}
