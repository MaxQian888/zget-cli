import path from 'node:path';
import process from 'node:process';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const convertMock = vi.fn();
const validateMock = vi.fn();
const generateOutputsMock = vi.fn();
const bootstrapWithPluginsMock = vi.fn();
const writeCliReferenceFileMock = vi.fn();
const writeToolingBaselineFileMock = vi.fn();

vi.mock('typedoc', () => ({
	Application: {
		bootstrapWithPlugins: bootstrapWithPluginsMock,
	},
}));

vi.mock('../../tools/docs/cli-reference.ts', () => ({
	writeCliReferenceFile: writeCliReferenceFileMock,
}));

vi.mock('../../tools/docs/tooling-baseline.ts', () => ({
	writeToolingBaselineFile: writeToolingBaselineFileMock,
}));

describe('generate docs', () => {
	const originalArgv = [...process.argv];

	beforeEach(() => {
		process.argv = [...originalArgv];
		bootstrapWithPluginsMock.mockResolvedValue({
			convert: convertMock,
			validate: validateMock,
			generateOutputs: generateOutputsMock,
		});
		convertMock.mockResolvedValue({name: 'project'});
		validateMock.mockReturnValue(undefined);
		generateOutputsMock.mockResolvedValue(undefined);
		writeCliReferenceFileMock.mockResolvedValue(undefined);
		writeToolingBaselineFileMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		process.argv = [...originalArgv];
		vi.restoreAllMocks();
		vi.resetModules();
		convertMock.mockReset();
		validateMock.mockReset();
		generateOutputsMock.mockReset();
		bootstrapWithPluginsMock.mockReset();
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

	it('boots TypeDoc with typedoc.json options and overridden output path', async () => {
		const {generateDocs} = await import('../../tools/docs/generate-docs');

		await generateDocs('D:/temp/docs');

		expect(bootstrapWithPluginsMock).toHaveBeenCalledWith(
			expect.objectContaining({
				entryPoints: ['./source/index.ts'],
				entryPointStrategy: 'resolve',
				tsconfig: './tsconfig.json',
				plugin: ['typedoc-plugin-markdown'],
				readme: 'none',
				cleanOutputDir: true,
				hideGenerator: true,
				out: 'D:/temp/docs/reference/api',
			}),
		);
		expect(validateMock).toHaveBeenCalledWith({name: 'project'});
		expect(generateOutputsMock).toHaveBeenCalledWith({name: 'project'});
		expect(writeCliReferenceFileMock).toHaveBeenCalledWith(
			path.join('D:/temp/docs', 'reference', 'cli.md'),
		);
		expect(writeToolingBaselineFileMock).toHaveBeenCalledWith(
			path.join('D:/temp/docs', 'reference', 'tooling-baseline.md'),
		);
	});

	it('rejects when TypeDoc cannot convert the project', async () => {
		convertMock.mockResolvedValueOnce(undefined);
		const {generateDocs} = await import('../../tools/docs/generate-docs');

		await expect(generateDocs('D:/temp/docs')).rejects.toThrow(
			'typedoc failed to convert the project.',
		);
	});

	it('runs generation on direct script execution', async () => {
		process.argv[1] = path.resolve('tools/docs/generate-docs.ts');

		await import('../../tools/docs/generate-docs');

		expect(bootstrapWithPluginsMock).toHaveBeenCalled();
		expect(writeCliReferenceFileMock).toHaveBeenCalled();
		expect(writeToolingBaselineFileMock).toHaveBeenCalled();
	});
});
