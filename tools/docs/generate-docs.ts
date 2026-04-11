import {readFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {Application, type TypeDocOptions} from 'typedoc';
import {writeCliReferenceFile} from './cli-reference.ts';
import {writeToolingBaselineFile} from './tooling-baseline.ts';

export type GeneratedDocPaths = {
	readonly apiOutDir: string;
	readonly cliReferenceFile: string;
	readonly toolingBaselineFile: string;
};

type TypeDocConfigFile = TypeDocOptions & {
	readonly $schema?: string;
	readonly out?: string;
};

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

async function loadTypeDocOptions(apiOutDir: string): Promise<TypeDocOptions> {
	const configUrl = new URL('../../typedoc.json', import.meta.url);
	const configContent = await readFile(configUrl, 'utf8');
	const {
		$schema: _schema,
		out: _ignoredOut,
		...options
	} = JSON.parse(configContent) as TypeDocConfigFile;

	return {
		...options,
		out: apiOutDir.replaceAll('\\', '/'),
	};
}

async function runTypeDoc(apiOutDir: string): Promise<void> {
	const app = await Application.bootstrapWithPlugins(
		await loadTypeDocOptions(apiOutDir),
	);
	const project = await app.convert();

	if (!project) {
		throw new Error('typedoc failed to convert the project.');
	}

	app.validate(project);
	await app.generateOutputs(project);
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
