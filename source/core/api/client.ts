import {Buffer} from 'node:buffer';
import {getBrowserHeaders, getHtmlHeaders} from '../utils/headers';
import type {CookieStore} from '../auth/cookie-store';

export type ClientOptions = {
	cookieStore?: CookieStore;
	rateLimit?: number; // Ms between requests, default 500
};

export class ApiClient {
	private lastRequestTime = 0;

	constructor(private readonly options: ClientOptions = {}) {}

	async getJson<T>(
		url: string,
		parameters?: Record<string, string>,
		extraHeaders?: Record<string, string>,
	): Promise<T> {
		await this.throttle();
		const fullUrl = new URL(url);
		if (parameters) {
			for (const [key, value] of Object.entries(parameters)) {
				fullUrl.searchParams.set(key, value);
			}
		}

		const response = await fetch(fullUrl.toString(), {
			headers: {...this.getHeaders(), ...extraHeaders},
		});

		if (!response.ok) {
			throw new Error(
				`API request failed: ${response.status} ${
					response.statusText
				} (${fullUrl.toString()})`,
			);
		}

		return response.json() as Promise<T>;
	}

	async getHtml(url: string): Promise<string> {
		await this.throttle();
		const response = await fetch(url, {
			headers: this.getHeaders(true),
		});

		if (!response.ok) {
			throw new Error(
				`HTML request failed: ${response.status} ${response.statusText} (${url})`,
			);
		}

		return response.text();
	}

	async getBuffer(url: string): Promise<Buffer> {
		await this.throttle();
		const response = await fetch(url, {
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(
				`Download failed: ${response.status} ${response.statusText} (${url})`,
			);
		}

		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	async getStream(
		url: string,
	): Promise<{body: ReadableStream<Uint8Array>; contentLength: number}> {
		await this.throttle();
		const response = await fetch(url, {
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(
				`Stream failed: ${response.status} ${response.statusText} (${url})`,
			);
		}

		const contentLength = Number.parseInt(
			response.headers.get('content-length') ?? '0',
			10,
		);

		return {
			body: response.body!,
			contentLength,
		};
	}

	async postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
		await this.throttle();
		const headers = this.getHeaders();
		headers['Content-Type'] = 'application/json';

		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(
				`POST request failed: ${response.status} ${response.statusText} (${url})`,
			);
		}

		return response.json() as Promise<T>;
	}

	async putJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
		await this.throttle();
		const headers = this.getHeaders();
		headers['Content-Type'] = 'application/json';

		const response = await fetch(url, {
			method: 'PUT',
			headers,
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(
				`PUT request failed: ${response.status} ${response.statusText} (${url})`,
			);
		}

		const text = await response.text();
		return JSON.parse(text || '{}') as T;
	}

	async patchJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
		await this.throttle();
		const headers = this.getHeaders();
		headers['Content-Type'] = 'application/json';

		const response = await fetch(url, {
			method: 'PATCH',
			headers,
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(
				`PATCH request failed: ${response.status} ${response.statusText} (${url})`,
			);
		}

		const text = await response.text();
		return JSON.parse(text || '{}') as T;
	}

	async deleteJson<T>(url: string): Promise<T> {
		await this.throttle();
		const response = await fetch(url, {
			method: 'DELETE',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(
				`DELETE request failed: ${response.status} ${response.statusText} (${url})`,
			);
		}

		const text = await response.text();
		return JSON.parse(text || '{}') as T;
	}

	// Raw PUT for binary body (used by OSS image upload). Headers passed in
	// fully override defaults — OSS rejects extra browser headers.
	async putBuffer(
		url: string,
		body: Buffer,
		headers: Record<string, string>,
	): Promise<{status: number; headers: Headers}> {
		await this.throttle();
		const response = await fetch(url, {
			method: 'PUT',
			headers,
			body: new Uint8Array(body),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => '');
			throw new Error(
				`OSS PUT failed: ${response.status} ${response.statusText} ${errorText} (${url})`,
			);
		}

		return {status: response.status, headers: response.headers};
	}

	private async throttle(): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		if (elapsed < this.requestRateLimit) {
			await new Promise(resolve => {
				setTimeout(resolve, this.requestRateLimit - elapsed);
			});
		}

		this.lastRequestTime = Date.now();
	}

	private getHeaders(isHtml = false): Record<string, string> {
		const base = isHtml ? getHtmlHeaders() : getBrowserHeaders();
		const headers: Record<string, string> = {...base};

		if (this.cookieStore) {
			headers.Cookie = this.cookieStore.getCookieString();
			const xsrf = this.cookieStore.getXsrfToken();
			if (xsrf) {
				headers['x-xsrftoken'] = xsrf;
			}
		}

		return headers;
	}

	private get cookieStore(): CookieStore | undefined {
		return this.options.cookieStore;
	}

	private get requestRateLimit(): number {
		return this.options.rateLimit ?? 500;
	}
}
