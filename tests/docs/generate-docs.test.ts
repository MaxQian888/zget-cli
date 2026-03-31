import path from 'node:path';
import process from 'node:process';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const execFileMock = vi.fn();
const writeCliReferenceFileMock = vi.fn();
const writeToolingBaselineFileMock = vi.fn();

vi.mock('node:child_process', () => ({
	execFile: execFileMock,
}));

vi.mock('../../tools/docs/cli-reference', () => ({
	writeCliReferenceFile: writeCliReferenceFileMock,
}));

vi.mock('../../tools/docs/tooling-baseline', () => ({
	writeToolingBaselineFile: writeToolingBaselineFileMock,
}));

describe('generate docs', () => {
	const originalArgv = [...process.argv];

	beforeEach(() => {
		process.argv = [...originalArgv];
		execFileMock.mockImplementation(
			(
				_command: string,
				_args: readonly string[],
				_options: object,
				callback: (error: Error | null) => void,
			) => {
				callback(null);
			},
		);
		writeCliReferenceFileMock.mockResolvedValue(undefined);
		writeToolingBaselineFileMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		process.argv = [...originalArgv];
		vi.restoreAllMocks();
		vi.resetModules();
		execFileMock.mockReset();
		writeCliReferenceFileMock.mockReset();
		writeToolingBaselineFileMock.mockReset();
	});

	it('resolves generated doc paths under the docs/reference tree', async () => {
		const {resolveGeneratedDocPaths} = await import(
			'../../tools/docs/generate-docs'
		);

		expect(resolveGeneratedDocPaths('D:/temp/docs')).toEqual({
			apiOutDir: path.join('D:/temp/docs', 'reference', 'api'),
			cliReferenceFile: path.join('D:/temp/docs', 'reference', 'cli.md'),
			toolingBaselineFile: path.join(
				'D:/temp/docs',
				'reference',
				'tooling-baseline.md',
			),
		});
	});

	it('uses cmd.exe for typedoc execution on Windows', async () => {
		vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
		const {generateDocs} = await import('../../tools/docs/generate-docs');

		await generateDocs('D:/temp/docs');

		expect(execFileMock).toHaveBeenCalledWith(
			'cmd.exe',
			expect.arrayContaining(['/d', '/s', '/c']),
			expect.any(Object),
			expect.any(Function),
		);
		expect(writeCliReferenceFileMock).toHaveBeenCalledWith(
			path.join('D:/temp/docs', 'reference', 'cli.md'),
		);
		expect(writeToolingBaselineFileMock).toHaveBeenCalledWith(
			path.join('D:/temp/docs', 'reference', 'tooling-baseline.md'),
		);
	});

	it('uses pnpm directly for typedoc execution on non-Windows platforms', async () => {
		vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
		const {generateDocs} = await import('../../tools/docs/generate-docs');

		await generateDocs('D:/temp/docs');

		expect(execFileMock).toHaveBeenCalledWith(
			'pnpm',
			[
				'exec',
				'typedoc',
				'--options',
				'typedoc.json',
				'--out',
				path.join('D:/temp/docs', 'reference', 'api'),
			],
			expect.any(Object),
			expect.any(Function),
		);
	});

	it('rejects when the typedoc process fails', async () => {
		execFileMock.mockImplementationOnce(
			(
				_command: string,
				_args: readonly string[],
				_options: Record<string, unknown>,
				callback: (error: Error | null) => void,
			) => {
				callback(new Error('typedoc failed'));
			},
		);
		vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
		const {generateDocs} = await import('../../tools/docs/generate-docs');

		await expect(generateDocs('D:/temp/docs')).rejects.toThrow(
			'typedoc failed',
		);
	});

	it('runs generation on direct script execution', async () => {
		process.argv[1] = path.resolve('tools/docs/generate-docs.ts');
		vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');

		await import('../../tools/docs/generate-docs');

		expect(execFileMock).toHaveBeenCalled();
		expect(writeCliReferenceFileMock).toHaveBeenCalled();
		expect(writeToolingBaselineFileMock).toHaveBeenCalled();
	});
});
