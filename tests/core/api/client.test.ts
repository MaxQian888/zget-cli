import {Buffer} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {CookieStore} from '../../../source/core/auth/cookie-store';
import {ApiClient} from '../../../source/core/api/client';

describe('ApiClient', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('appends query parameters and cookie headers for JSON requests', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ok: true}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const cookieStore = new CookieStore();
		vi.spyOn(cookieStore, 'getCookieString').mockReturnValue(
			'z_c0=z; _xsrf=token',
		);
		vi.spyOn(cookieStore, 'getXsrfToken').mockReturnValue('token');

		const client = new ApiClient({
			cookieStore,
			rateLimit: 0,
		});

		await expect(
			client.getJson<{ok: boolean}>('https://api.example.com/data', {
				page: '1',
				query: 'hello',
			}),
		).resolves.toEqual({ok: true});

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.example.com/data?page=1&query=hello',
			expect.objectContaining({
				headers: expect.objectContaining({
					Cookie: 'z_c0=z; _xsrf=token',
					'x-xsrftoken': 'token',
				}),
			}),
		);
	});

	it('uses html headers for page requests', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => '<html></html>',
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ApiClient({rateLimit: 0});
		await expect(client.getHtml('https://example.com/page')).resolves.toBe(
			'<html></html>',
		);

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(init.headers).toEqual(
			expect.objectContaining({
				Accept: expect.stringContaining('text/html'),
			}),
		);
	});

	it('returns buffers and streams for binary responses', async () => {
		const body = new ReadableStream<Uint8Array>();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
			})
			.mockResolvedValueOnce({
				ok: true,
				body,
				headers: {
					get: () => '128',
				},
			});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ApiClient({rateLimit: 0});
		await expect(
			client.getBuffer('https://example.com/file.bin'),
		).resolves.toEqual(Buffer.from([1, 2, 3]));
		await expect(
			client.getStream('https://example.com/file.bin'),
		).resolves.toEqual({
			body,
			contentLength: 128,
		});
	});

	it('posts JSON bodies and throttles rapid follow-up requests', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({saved: true}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ApiClient({rateLimit: 100});

		await expect(
			client.postJson<{saved: boolean}>('https://api.example.com/save', {
				title: 'hello',
			}),
		).resolves.toEqual({saved: true});

		const pending = client.postJson<{saved: boolean}>(
			'https://api.example.com/save',
			{
				title: 'again',
			},
		);
		await vi.advanceTimersByTimeAsync(100);
		await expect(pending).resolves.toEqual({saved: true});

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(init.headers).toEqual(
			expect.objectContaining({
				'Content-Type': 'application/json',
			}),
		);
		expect(init.body).toBe(JSON.stringify({title: 'hello'}));
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('throws clear errors for failed requests', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			statusText: 'Not Found',
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ApiClient({rateLimit: 0});
		await expect(
			client.getJson('https://api.example.com/missing'),
		).rejects.toThrow(
			'API request failed: 404 Not Found (https://api.example.com/missing)',
		);
	});

	it('throws specific errors for failed html, buffer, stream, and post requests', async () => {
		const client = new ApiClient({rateLimit: 0});

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Server Error',
			}),
		);
		await expect(client.getHtml('https://example.com/html')).rejects.toThrow(
			'HTML request failed: 500 Server Error (https://example.com/html)',
		);

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				statusText: 'Forbidden',
			}),
		);
		await expect(client.getBuffer('https://example.com/file')).rejects.toThrow(
			'Download failed: 403 Forbidden (https://example.com/file)',
		);

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
			}),
		);
		await expect(
			client.getStream('https://example.com/stream'),
		).rejects.toThrow(
			'Stream failed: 401 Unauthorized (https://example.com/stream)',
		);

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
			}),
		);
		await expect(
			client.postJson('https://example.com/post', {id: 1}),
		).rejects.toThrow(
			'POST request failed: 400 Bad Request (https://example.com/post)',
		);
	});
});
