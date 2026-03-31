import os from 'node:os';
import path from 'node:path';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {afterEach, describe, expect, it} from 'vitest';
import {findGeneratedDocMismatches} from '../../tools/docs/doc-check';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map(async directory => rm(directory, {recursive: true, force: true})),
	);
});

describe('generated docs check', () => {
	it('reports stale generated docs when actual output drifts from expected output', async () => {
		const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docs-check-'));
		temporaryDirectories.push(temporaryRoot);

		const expectedFile = path.join(temporaryRoot, 'expected.md');
		const actualFile = path.join(temporaryRoot, 'actual.md');

		await writeFile(expectedFile, '# Expected\n');
		await writeFile(actualFile, '# Actual\n');

		const mismatches = await findGeneratedDocMismatches([
			{
				expectedPath: expectedFile,
				actualPath: actualFile,
				label: 'cli-reference',
			},
		]);

		expect(mismatches).toEqual([
			expect.objectContaining({
				label: 'cli-reference',
				reason: 'content_mismatch',
			}),
		]);
	});

	it('reports missing generated docs when the expected output file is absent', async () => {
		const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docs-check-'));
		temporaryDirectories.push(temporaryRoot);

		const expectedFile = path.join(temporaryRoot, 'expected.md');
		const actualFile = path.join(temporaryRoot, 'actual.md');

		await writeFile(expectedFile, '# Expected\n');

		const mismatches = await findGeneratedDocMismatches([
			{
				expectedPath: expectedFile,
				actualPath: actualFile,
				label: 'api-reference',
			},
		]);

		expect(mismatches).toEqual([
			expect.objectContaining({
				label: 'api-reference',
				reason: 'missing_actual',
			}),
		]);
	});

	it('reports missing expected docs when the committed file is absent', async () => {
		const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docs-check-'));
		temporaryDirectories.push(temporaryRoot);

		const expectedFile = path.join(temporaryRoot, 'expected.md');
		const actualFile = path.join(temporaryRoot, 'actual.md');

		await writeFile(actualFile, '# Actual\n');

		const mismatches = await findGeneratedDocMismatches([
			{expectedPath: expectedFile, actualPath: actualFile, label: 'baseline'},
		]);

		expect(mismatches).toEqual([
			expect.objectContaining({
				label: 'baseline',
				reason: 'missing_expected',
			}),
		]);
	});

	it('returns an empty mismatch list when generated docs already match', async () => {
		const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'docs-check-'));
		temporaryDirectories.push(temporaryRoot);

		const expectedFile = path.join(temporaryRoot, 'expected.md');
		const actualFile = path.join(temporaryRoot, 'actual.md');

		await writeFile(expectedFile, '# Expected\n');
		await writeFile(actualFile, '# Expected\n');

		await expect(
			findGeneratedDocMismatches([
				{expectedPath: expectedFile, actualPath: actualFile, label: 'matching'},
			]),
		).resolves.toEqual([]);
	});
});
