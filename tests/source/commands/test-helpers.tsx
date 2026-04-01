import {cleanup} from 'ink-testing-library';
import {afterEach, beforeEach, vi} from 'vitest';
import {type GlobalFlags} from '../../../source/commands/types';
import type {DownloadResult} from '../../../source/core/downloader/types';

export const baseFlags = {
	output: './downloads',
	verbose: false,
	resume: true,
	images: true,
} satisfies GlobalFlags;

export function setupCommandTestHarness(): void {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
			handler: TimerHandler,
		) => {
			if (typeof handler === 'function') {
				handler();
			}

			return 0 as ReturnType<typeof setTimeout>;
		}) as typeof setTimeout);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});
}

export async function flushAsync(rounds = 6): Promise<void> {
	if (rounds <= 0) {
		return;
	}

	await Promise.resolve();
	await new Promise(resolve => {
		setImmediate(resolve);
	});
	await flushAsync(rounds - 1);
}

export function createDownloadResult(
	overrides: Partial<DownloadResult> = {},
): DownloadResult {
	return {
		success: true,
		title: '测试标题',
		author: '测试作者',
		outputPath: 'D:/downloads/test.md',
		imageCount: 2,
		...overrides,
	};
}
