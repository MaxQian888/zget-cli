import {parseUrl, type ParsedUrl} from './url-parser';

const xhsShortLinkPattern = /xhslink\.com\//i;
const maxRedirects = 5;
const defaultTimeoutMs = 10_000;

export function isXhsShortLink(input: string): boolean {
	return xhsShortLinkPattern.test(input);
}

export async function resolveXhsShortLink(
	input: string,
	options: {timeoutMs?: number; fetchImpl?: typeof fetch} = {},
): Promise<string> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
	let current = input.trim();

	for (let hop = 0; hop < maxRedirects; hop += 1) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, timeoutMs);

		let response: Response;
		try {
			// Sequential by design — each redirect must resolve before deciding the next URL.
			// eslint-disable-next-line no-await-in-loop
			response = await fetchImpl(current, {
				method: 'GET',
				redirect: 'manual',
				signal: controller.signal,
				headers: {
					'user-agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
				},
			});
		} finally {
			clearTimeout(timeoutId);
		}

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) {
				throw new Error(
					`Short link redirect missing Location header: ${current}`,
				);
			}

			current = new URL(location, current).toString();
			continue;
		}

		// Non-redirect response — current is the final URL.
		return current;
	}

	throw new Error(
		`Short link exceeded ${maxRedirects} redirects without resolving: ${input}`,
	);
}

export async function parseUrlAsync(
	input: string,
	options: {fetchImpl?: typeof fetch; timeoutMs?: number} = {},
): Promise<ParsedUrl> {
	if (isXhsShortLink(input)) {
		const resolved = await resolveXhsShortLink(input, options);
		return parseUrl(resolved);
	}

	return parseUrl(input);
}
