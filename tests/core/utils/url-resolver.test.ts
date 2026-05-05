import {describe, expect, it, vi} from 'vitest';
import {
	isXhsShortLink,
	parseUrlAsync,
	resolveXhsShortLink,
} from '../../../source/core/utils/url-resolver';

function createFetchStub(
	steps: Array<{status: number; location?: string}>,
): typeof fetch {
	let callIndex = 0;
	const stub = vi.fn(async (input: string | URL | Request) => {
		const step = steps[callIndex];
		callIndex += 1;
		if (!step) {
			throw new Error(`unexpected fetch call: ${String(input)}`);
		}

		return new Response(null, {
			status: step.status,
			headers: step.location ? {location: step.location} : undefined,
		});
	});
	return stub as unknown as typeof fetch;
}

describe('isXhsShortLink', () => {
	it('detects xhslink hosts case-insensitively', () => {
		expect(isXhsShortLink('https://xhslink.com/abc123')).toBe(true);
		expect(isXhsShortLink('https://XHSLINK.com/path')).toBe(true);
	});

	it('rejects non-xhslink urls', () => {
		expect(isXhsShortLink('https://www.xiaohongshu.com/explore/123')).toBe(
			false,
		);
		expect(isXhsShortLink('plain-text')).toBe(false);
	});
});

describe('resolveXhsShortLink', () => {
	it('follows a single 302 to the final url', async () => {
		const fetchImpl = createFetchStub([
			{status: 302, location: 'https://www.xiaohongshu.com/explore/abc123'},
			{status: 200},
		]);
		const final = await resolveXhsShortLink('https://xhslink.com/abc', {
			fetchImpl,
		});
		expect(final).toBe('https://www.xiaohongshu.com/explore/abc123');
	});

	it('follows up to 5 hops then errors', async () => {
		const steps = Array.from({length: 6}, (_, i) => ({
			status: 302,
			location: `https://hop${i + 1}.example.com/`,
		}));
		const fetchImpl = createFetchStub(steps);
		await expect(
			resolveXhsShortLink('https://xhslink.com/loop', {fetchImpl}),
		).rejects.toThrow(/exceeded 5 redirects/);
	});

	it('errors when redirect lacks Location header', async () => {
		const fetchImpl = createFetchStub([{status: 302}]);
		await expect(
			resolveXhsShortLink('https://xhslink.com/bad', {fetchImpl}),
		).rejects.toThrow(/missing Location header/);
	});
});

describe('parseUrlAsync', () => {
	it('resolves short links and re-parses', async () => {
		const fetchImpl = createFetchStub([
			{status: 302, location: 'https://www.xiaohongshu.com/explore/abc123'},
			{status: 200},
		]);
		const parsed = await parseUrlAsync('https://xhslink.com/x', {fetchImpl});
		expect(parsed).toEqual({
			platform: 'xhs',
			type: 'note',
			noteId: 'abc123',
		});
	});

	it('passes non-short urls straight through to parseUrl', async () => {
		const parsed = await parseUrlAsync(
			'https://www.xiaohongshu.com/explore/deadbeef',
		);
		expect(parsed).toEqual({
			platform: 'xhs',
			type: 'note',
			noteId: 'deadbeef',
		});
	});
});
