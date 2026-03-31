import {readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {downloadsStateDir, ensureConfigDir} from '../utils/config';

type TrackerState = {
	batchId: string;
	completed: string[];
	failed: Record<string, string>;
};

export class DownloadTracker {
	private readonly filePath: string;
	private completedSet = new Set<string>();
	private failedMap = new Map<string, string>();

	constructor(private readonly batchId: string) {
		this.filePath = join(downloadsStateDir, `${batchId}.json`);
	}

	async load(): Promise<void> {
		if (!existsSync(this.filePath)) return;

		try {
			const raw = await readFile(this.filePath, 'utf8');
			const state = JSON.parse(raw) as TrackerState;
			this.completedSet = new Set(state.completed);
			this.failedMap = new Map(Object.entries(state.failed));
		} catch {
			// Start fresh if file is corrupted
		}
	}

	async save(): Promise<void> {
		await ensureConfigDir();
		const state: TrackerState = {
			batchId: this.batchId,
			completed: [...this.completedSet],
			failed: Object.fromEntries(this.failedMap),
		};
		await writeFile(this.filePath, JSON.stringify(state, null, 2), 'utf8');
	}

	isCompleted(itemId: string): boolean {
		return this.completedSet.has(itemId);
	}

	markCompleted(itemId: string): void {
		this.completedSet.add(itemId);
		this.failedMap.delete(itemId);
	}

	markFailed(itemId: string, error: string): void {
		this.failedMap.set(itemId, error);
	}

	get completedCount(): number {
		return this.completedSet.size;
	}

	get failedCount(): number {
		return this.failedMap.size;
	}
}
