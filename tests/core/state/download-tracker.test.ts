import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {existsSyncMock, readFileMock, writeFileMock, ensureConfigDirMock} =
	vi.hoisted(() => ({
		existsSyncMock: vi.fn(),
		readFileMock: vi.fn(),
		writeFileMock: vi.fn(),
		ensureConfigDirMock: vi.fn(),
	}));

vi.mock('node:fs', () => ({
	existsSync: existsSyncMock,
}));

vi.mock('node:fs/promises', () => ({
	readFile: readFileMock,
	writeFile: writeFileMock,
}));

vi.mock('../../../source/core/utils/config', () => ({
	downloadsStateDir: 'D:/tmp/downloads',
	ensureConfigDir: ensureConfigDirMock,
}));

import {DownloadTracker} from '../../../source/core/state/download-tracker';

describe('DownloadTracker', () => {
	beforeEach(() => {
		existsSyncMock.mockReset();
		readFileMock.mockReset();
		writeFileMock.mockReset();
		ensureConfigDirMock.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('loads completed and failed entries from disk', async () => {
		existsSyncMock.mockReturnValue(true);
		readFileMock.mockResolvedValue(
			JSON.stringify({
				batchId: 'batch-1',
				completed: ['a', 'b'],
				failed: {c: 'network'},
			}),
		);

		const tracker = new DownloadTracker('batch-1');
		await tracker.load();

		expect(tracker.isCompleted('a')).toBe(true);
		expect(tracker.isCompleted('c')).toBe(false);
		expect(tracker.completedCount).toBe(2);
		expect(tracker.failedCount).toBe(1);
	});

	it('ignores missing or corrupted state files', async () => {
		existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
		readFileMock.mockRejectedValueOnce(new Error('bad json'));

		const missing = new DownloadTracker('batch-2');
		await missing.load();
		expect(missing.completedCount).toBe(0);

		const corrupted = new DownloadTracker('batch-3');
		await corrupted.load();
		expect(corrupted.completedCount).toBe(0);
		expect(corrupted.failedCount).toBe(0);
	});

	it('tracks completion and persists the current state', async () => {
		const tracker = new DownloadTracker('batch-4');

		tracker.markFailed('item-1', 'boom');
		tracker.markCompleted('item-1');
		tracker.markCompleted('item-2');
		await tracker.save();

		expect(ensureConfigDirMock).toHaveBeenCalledTimes(1);
		expect(writeFileMock).toHaveBeenCalledWith(
			path.join('D:/tmp/downloads', 'batch-4.json'),
			expect.stringContaining(
				'"completed": [\n    "item-1",\n    "item-2"\n  ]',
			),
			'utf8',
		);
		expect(tracker.failedCount).toBe(0);
		expect(tracker.completedCount).toBe(2);
	});
});
