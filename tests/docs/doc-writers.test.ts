import os from 'node:os';
import path from 'node:path';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {afterEach, describe, expect, it} from 'vitest';
import {
	buildCliReferenceMarkdown,
	writeCliReferenceFile,
} from '../../tools/docs/cli-reference';
import {
	buildToolingBaselineMarkdown,
	writeToolingBaselineFile,
} from '../../tools/docs/tooling-baseline';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map(async directory => rm(directory, {recursive: true, force: true})),
	);
});

describe('generated doc writers', () => {
	it('writes the CLI reference markdown to disk', async () => {
		const temporaryRoot = await mkdtemp(
			path.join(os.tmpdir(), 'cli-reference-'),
		);
		temporaryDirectories.push(temporaryRoot);

		const outputPath = path.join(temporaryRoot, 'cli.md');
		await writeCliReferenceFile(outputPath);

		await expect(readFile(outputPath, 'utf8')).resolves.toBe(
			buildCliReferenceMarkdown(),
		);
	});

	it('writes the tooling baseline markdown to disk', async () => {
		const temporaryRoot = await mkdtemp(
			path.join(os.tmpdir(), 'tooling-baseline-'),
		);
		temporaryDirectories.push(temporaryRoot);

		const outputPath = path.join(temporaryRoot, 'tooling-baseline.md');
		await writeToolingBaselineFile(outputPath);

		await expect(readFile(outputPath, 'utf8')).resolves.toBe(
			buildToolingBaselineMarkdown(),
		);
	});
});
