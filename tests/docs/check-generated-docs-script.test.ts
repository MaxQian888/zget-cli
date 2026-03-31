import path from 'node:path';
import process from 'node:process';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const mkdtempMock = vi.fn();
const readdirMock = vi.fn();
const rmMock = vi.fn();
const generateDocsMock = vi.fn();
const resolveGeneratedDocPathsMock = vi.fn();
const findGeneratedDocMismatchesMock = vi.fn();

vi.mock('node:fs/promises', () => ({
	mkdtemp: mkdtempMock,
	readdir: readdirMock,
	rm: rmMock,
}));

vi.mock('../../tools/docs/generate-docs', () => ({
	generateDocs: generateDocsMock,
	resolveGeneratedDocPaths: resolveGeneratedDocPathsMock,
}));

vi.mock('../../tools/docs/doc-check', () => ({
	findGeneratedDocMismatches: findGeneratedDocMismatchesMock,
}));

describe('check generated docs', () => {
	const originalArgv = [...process.argv];

	beforeEach(() => {
		process.argv = [...originalArgv];
		mkdtempMock.mockResolvedValue('D:/temp/generated-docs');
		rmMock.mockResolvedValue(undefined);
		generateDocsMock.mockResolvedValue(undefined);
		findGeneratedDocMismatchesMock.mockResolvedValue([]);
		resolveGeneratedDocPathsMock
			.mockReturnValueOnce({
				apiOutDir: path.join('D:/repo/docs', 'reference', 'api'),
				cliReferenceFile: path.join('D:/repo/docs', 'reference', 'cli.md'),
				toolingBaselineFile: path.join(
					'D:/repo/docs',
					'reference',
					'tooling-baseline.md',
				),
			})
			.mockReturnValueOnce({
				apiOutDir: path.join('D:/temp/generated-docs', 'reference', 'api'),
				cliReferenceFile: path.join(
					'D:/temp/generated-docs',
					'reference',
					'cli.md',
				),
				toolingBaselineFile: path.join(
					'D:/temp/generated-docs',
					'reference',
					'tooling-baseline.md',
				),
			});
		readdirMock.mockImplementation(async (targetPath: string) => {
			if (targetPath.endsWith(path.join('reference', 'api'))) {
				return [
					{
						name: 'functions',
						isDirectory: () => true,
						isFile: () => false,
					},
					{
						name: 'README.md',
						isDirectory: () => false,
						isFile: () => true,
					},
				];
			}

			if (targetPath.endsWith(path.join('reference', 'api', 'functions'))) {
				return [
					{
						name: 'App.md',
						isDirectory: () => false,
						isFile: () => true,
					},
				];
			}

			return [];
		});
	});

	afterEach(() => {
		process.argv = [...originalArgv];
		vi.resetModules();
		vi.restoreAllMocks();
		mkdtempMock.mockReset();
		readdirMock.mockReset();
		rmMock.mockReset();
		generateDocsMock.mockReset();
		resolveGeneratedDocPathsMock.mockReset();
		findGeneratedDocMismatchesMock.mockReset();
	});

	it('builds pairs for static docs and generated API docs', async () => {
		const {checkGeneratedDocs} = await import(
			'../../tools/docs/check-generated-docs'
		);

		const pairs = await checkGeneratedDocs();

		expect(generateDocsMock).toHaveBeenCalledWith('D:/temp/generated-docs');
		expect(findGeneratedDocMismatchesMock).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({label: 'cli.md'}),
				expect.objectContaining({label: 'tooling-baseline.md'}),
				expect.objectContaining({label: path.join('api', 'README.md')}),
				expect.objectContaining({
					label: path.join('api', 'functions', 'App.md'),
				}),
			]),
		);
		expect(pairs).toHaveLength(4);
		expect(rmMock).toHaveBeenCalledWith('D:/temp/generated-docs', {
			recursive: true,
			force: true,
		});
	});

	it('throws when generated docs are stale or missing', async () => {
		findGeneratedDocMismatchesMock.mockResolvedValue([
			{
				label: 'cli.md',
				reason: 'content_mismatch',
				expectedPath: 'expected',
				actualPath: 'actual',
			},
		]);
		const {checkGeneratedDocs} = await import(
			'../../tools/docs/check-generated-docs'
		);

		await expect(checkGeneratedDocs()).rejects.toThrow(
			'Generated docs are stale or missing. Run `pnpm docs:generate`.',
		);
	});

	it('treats missing api directories as empty during pair construction', async () => {
		readdirMock.mockRejectedValue(new Error('missing'));
		const {checkGeneratedDocs} = await import(
			'../../tools/docs/check-generated-docs'
		);

		const pairs = await checkGeneratedDocs();

		expect(findGeneratedDocMismatchesMock).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({label: 'cli.md'}),
				expect.objectContaining({label: 'tooling-baseline.md'}),
			]),
		);
		expect(pairs).toHaveLength(2);
	});

	it('runs the check on direct script execution', async () => {
		process.argv[1] = path.resolve('tools/docs/check-generated-docs.ts');

		await import('../../tools/docs/check-generated-docs');

		expect(generateDocsMock).toHaveBeenCalled();
	});
});
