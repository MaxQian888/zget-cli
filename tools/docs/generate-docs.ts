import {execFile} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {writeCliReferenceFile} from './cli-reference';
import {writeToolingBaselineFile} from './tooling-baseline';

export type GeneratedDocPaths = {
	readonly apiOutDir: string;
	readonly cliReferenceFile: string;
	readonly toolingBaselineFile: string;
};

async function runCommand(
	command: string,
	args: readonly string[],
): Promise<void> {
	return new Promise((resolve, reject) => {
		execFile(
			command,
			[...args],
			{
				cwd: process.cwd(),
				env: process.env,
			},
			error => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			},
		);
	});
}

export function resolveGeneratedDocPaths(
	outputRoot = path.join(process.cwd(), 'docs'),
): GeneratedDocPaths {
	const referenceRoot = path.join(outputRoot, 'reference');

	return {
		apiOutDir: path.join(referenceRoot, 'api'),
		cliReferenceFile: path.join(referenceRoot, 'cli.md'),
		toolingBaselineFile: path.join(referenceRoot, 'tooling-baseline.md'),
	};
}

async function runTypeDoc(apiOutDir: string): Promise<void> {
	if (process.platform === 'win32') {
		const relativeOutDir = path
			.relative(process.cwd(), apiOutDir)
			.replaceAll('\\', '/');

		await runCommand('cmd.exe', [
			'/d',
			'/s',
			'/c',
			`pnpm exec typedoc --options typedoc.json --out ${relativeOutDir}`,
		]);
		return;
	}

	await runCommand('pnpm', [
		'exec',
		'typedoc',
		'--options',
		'typedoc.json',
		'--out',
		apiOutDir,
	]);
}

export async function generateDocs(
	outputRoot?: string,
): Promise<GeneratedDocPaths> {
	const paths = resolveGeneratedDocPaths(outputRoot);

	await runTypeDoc(paths.apiOutDir);
	await Promise.all([
		writeCliReferenceFile(paths.cliReferenceFile),
		writeToolingBaselineFile(paths.toolingBaselineFile),
	]);

	return paths;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	await generateDocs();
}
