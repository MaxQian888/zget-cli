import {createHmac, randomBytes} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import process from 'node:process';
import type {XCredentials} from '../api/x-types';
import {xCredentialsFile} from '../utils/config';

function percentEncode(string_: string): string {
	return encodeURIComponent(string_)
		.replaceAll('!', '%21')
		.replaceAll('*', '%2A')
		.replaceAll("'", '%27')
		.replaceAll('(', '%28')
		.replaceAll(')', '%29');
}

function generateOauthHeader(
	method: string,
	url: string,
	parameters: Record<string, string>,
	credentials: XCredentials,
): string {
	const oauthParameters = Object.fromEntries([
		['oauth_consumer_key', credentials.apiKey],
		['oauth_nonce', randomBytes(16).toString('hex')],
		['oauth_signature_method', 'HMAC-SHA1'],
		['oauth_timestamp', Math.floor(Date.now() / 1000).toString()],
		['oauth_token', credentials.accessToken],
		['oauth_version', '1.0'],
	]) as Record<string, string>;

	// Combine all params for signing
	const allParameters: Record<string, string> = {
		...parameters,
		...oauthParameters,
	};

	// Sort and encode
	const parameterString = Object.keys(allParameters)
		.sort()
		.map(key => `${percentEncode(key)}=${percentEncode(allParameters[key]!)}`)
		.join('&');

	// Build signature base string
	const baseString = [
		method.toUpperCase(),
		percentEncode(url),
		percentEncode(parameterString),
	].join('&');

	// Create signing key
	const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(
		credentials.accessTokenSecret,
	)}`;

	// Generate signature
	const signature = createHmac('sha1', signingKey)
		.update(baseString)
		.digest('base64');

	const oauthSignatureKey = 'oauth_signature';
	oauthParameters[oauthSignatureKey] = signature;

	// Build Authorization header
	const headerParts = Object.keys(oauthParameters)
		.sort()
		.map(
			key => `${percentEncode(key)}="${percentEncode(oauthParameters[key]!)}"`,
		)
		.join(', ');

	return `OAuth ${headerParts}`;
}

export {generateOauthHeader as generateOAuthHeader};

class TwitterCredentialsManager {
	private credentials: XCredentials | undefined;

	async load(): Promise<void> {
		// Try env vars first
		const fromEnv = this.loadFromEnv();
		if (fromEnv) {
			this.credentials = fromEnv;
			return;
		}

		// Try config file
		try {
			const content = await readFile(xCredentialsFile, 'utf8');
			this.credentials = JSON.parse(content) as XCredentials;
		} catch {
			// No credentials found
		}
	}

	async save(credentials: XCredentials): Promise<void> {
		this.credentials = credentials;
		await mkdir(dirname(xCredentialsFile), {recursive: true});
		await writeFile(xCredentialsFile, JSON.stringify(credentials, null, 2));
	}

	isConfigured(): boolean {
		return this.credentials !== undefined;
	}

	getCredentials(): XCredentials {
		if (!this.credentials) {
			throw new Error(
				'X API credentials not configured. Run "zget x login" or set environment variables.',
			);
		}

		return this.credentials;
	}

	getBearerToken(): string {
		return this.getCredentials().bearerToken;
	}

	private loadFromEnv(): XCredentials | undefined {
		const apiKey = process.env.X_API_KEY;
		const apiSecret = process.env.X_API_SECRET;
		const bearerToken = process.env.X_BEARER_TOKEN;
		const accessToken = process.env.X_ACCESS_TOKEN;
		const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

		if (
			apiKey &&
			apiSecret &&
			bearerToken &&
			accessToken &&
			accessTokenSecret
		) {
			return {apiKey, apiSecret, bearerToken, accessToken, accessTokenSecret};
		}

		return undefined;
	}
}

export {TwitterCredentialsManager as XCredentialStore};
