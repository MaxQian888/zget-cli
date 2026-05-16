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

import {downloadHnItem} from '../../../../source/core/downloader/platforms/hn-downloader';

describe('downloadHnItem', () => {
	beforeEach(() => {
		writeFileMock.mockReset();
		mkdirMock.mockReset();
	});

	it('writes a markdown file under <outputDir>/hn/<dir>/', async () => {
		const api = {
			getItem: vi.fn().mockResolvedValue({
				id: 42,
				title: 'Hello',
				by: 'pg',
				type: 'story',
			}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadHnItem(42, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.outputPath).toContain('hn');
		expect(result.outputPath.endsWith('.md')).toBe(true);
		expect(writeFileMock).toHaveBeenCalledTimes(1);
		const [, content] = writeFileMock.mock.calls[0] as [string, string];
		expect(content).toContain('# Hello');
	});

	it('reports failure when the item fetch throws', async () => {
		const api = {
			getItem: vi.fn().mockRejectedValue(new Error('boom')),
			getComments: vi.fn(),
		};

		const result = await downloadHnItem(999, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe('boom');
	});

	it('falls back to item.text as preview when there is no title', async () => {
		const api = {
			getItem: vi.fn().mockResolvedValue({
				id: 7,
				type: 'comment',
				text: '<p>just a comment body</p>',
				by: 'someone',
			}),
			getComments: vi.fn().mockResolvedValue([{id: 8, parent: 7, by: 'b'}]),
		};

		const result = await downloadHnItem(7, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});
		expect(result.success).toBe(true);
		expect(result.outputPath).toContain('hn');
	});

	it('emits progress events through the lifecycle', async () => {
		const phases: string[] = [];
		const api = {
			getItem: vi.fn().mockResolvedValue({id: 1, title: 't', type: 'story'}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		await downloadHnItem(1, api as never, {
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

	it('swallows getComments errors and still produces output', async () => {
		const api = {
			getItem: vi.fn().mockResolvedValue({
				id: 11,
				title: 'Resilient',
				by: 'pg',
				type: 'story',
			}),
			getComments: vi.fn().mockRejectedValue(new Error('comments down')),
		};

		const result = await downloadHnItem(11, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(writeFileMock).toHaveBeenCalledTimes(1);
	});

	it('falls back to default author and id-based preview when title strips to empty', async () => {
		const api = {
			getItem: vi.fn().mockResolvedValue({
				id: 5,
				title: '<b>   </b>',
				type: 'story',
			}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadHnItem(5, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.author).toBe('hn');
		expect(result.outputPath).toContain('hn_5');
	});

	it('uses item id when title and text are both missing', async () => {
		const api = {
			getItem: vi.fn().mockResolvedValue({id: 99, by: 'noop', type: 'story'}),
			getComments: vi.fn().mockResolvedValue([]),
		};

		const result = await downloadHnItem(99, api as never, {
			outputDir: 'D:/out',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.title).toBe('hn-99');
	});
});
