import {beforeEach, describe, expect, it, vi} from 'vitest';

const {writeFileMock, mkdirMock} = vi.hoisted(() => ({
	writeFileMock: vi.fn(),
	mkdirMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	writeFile: writeFileMock,
	mkdir: mkdirMock,
	readFile: vi.fn(),
}));

import {downloadV2exTopic} from '../../../../source/core/downloader/platforms/v2ex-downloader';

describe('downloadV2exTopic', () => {
	beforeEach(() => {
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('writes a markdown file under <outputDir>/v2ex/<dir>/', async () => {
		const api = {
			getTopic: vi.fn().mockResolvedValue({
				id: 7,
				title: 'Hello',
				replies: 0,
				created: 0,
				member: {id: 1, username: 'alice'},
			}),
			getReplies: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadV2exTopic(7, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.outputPath).toContain('v2ex');
		expect(result.outputPath.endsWith('.md')).toBe(true);
		expect(writeFileMock).toHaveBeenCalledTimes(1);
		const [, content] = writeFileMock.mock.calls[0] as [string, string];
		expect(content).toContain('# Hello');
	});

	it('reports failure when the topic fetch throws', async () => {
		const api = {
			getTopic: vi.fn().mockRejectedValue(new Error('boom')),
			getReplies: vi.fn(),
		};

		const result = await downloadV2exTopic(999, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe('boom');
	});

	it('falls back when the member is missing', async () => {
		const api = {
			getTopic: vi.fn().mockResolvedValue({
				id: 7,
				title: 'Hello',
				replies: 0,
				created: 0,
			}),
			getReplies: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadV2exTopic(7, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});
		expect(result.author).toBe('v2ex');
	});

	it('emits progress events through the lifecycle', async () => {
		const phases: string[] = [];
		const api = {
			getTopic: vi.fn().mockResolvedValue({
				id: 1,
				title: 't',
				replies: 0,
				created: 0,
			}),
			getReplies: vi.fn().mockResolvedValue([]),
		};

		await downloadV2exTopic(1, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
			onProgress(p) {
				phases.push(p.phase);
			},
		});

		expect(phases).toEqual(
			expect.arrayContaining(['fetching', 'parsing', 'writing', 'done']),
		);
	});

	it('swallows getReplies errors and still writes markdown', async () => {
		const api = {
			getTopic: vi.fn().mockResolvedValue({
				id: 9,
				title: 'Resilient',
				replies: 0,
				created: 0,
				member: {id: 1, username: 'alice'},
			}),
			getReplies: vi.fn().mockRejectedValue(new Error('replies down')),
		};

		const result = await downloadV2exTopic(9, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(writeFileMock).toHaveBeenCalledTimes(1);
	});

	it('uses v2ex_<id> dir name when title strips to empty', async () => {
		const api = {
			getTopic: vi.fn().mockResolvedValue({
				id: 12,
				title: '<b>   </b>',
				replies: 0,
				created: 0,
				member: {id: 1, username: 'alice'},
			}),
			getReplies: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadV2exTopic(12, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.outputPath).toContain('v2ex_12');
	});
});
