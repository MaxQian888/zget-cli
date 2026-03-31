import os from 'node:os';
import path from 'node:path';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {findGeneratedDocMismatches, type GeneratedDocPair} from './doc-check';
import {generateDocs, resolveGeneratedDocPaths} from './generate-docs';

async function listMarkdownFiles(rootPath: string): Promise<string[]> {
	let entries: Awaited<ReturnType<typeof readdir>>;

	try {
		entries = await readdir(rootPath, {withFileTypes: true});
	} catch {
		return [];
	}

	const results: string[] = [];

	await Promise.all(
		entries.map(async entry => {
			const absolutePath = path.join(rootPath, entry.name);

			if (entry.isDirectory()) {
				results.push(...(await listMarkdownFiles(absolutePath)));
				return;
			}

			if (entry.isFile() && absolutePath.endsWith('.md')) {
				results.push(absolutePath);
			}
		}),
	);

	return results.sort();
}

function buildStaticDocPairs(
	expectedRoot: string,
	actualRoot: string,
): GeneratedDocPair[] {
	return ['cli.md', 'tooling-baseline.md'].map(relativePath => ({
		label: relativePath,
		expectedPath: path.join(expectedRoot, relativePath),
		actualPath: path.join(actualRoot, relativePath),
	}));
}

async function buildApiDocPairs(
	expectedRoot: string,
	actualRoot: string,
): Promise<GeneratedDocPair[]> {
	const [expectedFiles, actualFiles] = await Promise.all([
		listMarkdownFiles(expectedRoot),
		listMarkdownFiles(actualRoot),
	]);

	const relativePaths = new Set([
		...expectedFiles.map(filePath => path.relative(expectedRoot, filePath)),
		...actualFiles.map(filePath => path.relative(actualRoot, filePath)),
	]);

	return [...relativePaths].sort().map(relativePath => ({
		label: path.join('api', relativePath),
		expectedPath: path.join(expectedRoot, relativePath),
		actualPath: path.join(actualRoot, relativePath),
	}));
}

export async function checkGeneratedDocs(): Promise<GeneratedDocPair[]> {
	const temporaryRoot = await mkdtemp(
		path.join(os.tmpdir(), 'generated-docs-'),
	);

	try {
		await generateDocs(temporaryRoot);

		const expectedPaths = resolveGeneratedDocPaths(
			path.join(process.cwd(), 'docs'),
		);
		const actualPaths = resolveGeneratedDocPaths(temporaryRoot);
		const pairs = [
			...buildStaticDocPairs(
				path.dirname(expectedPaths.cliReferenceFile),
				path.dirname(actualPaths.cliReferenceFile),
			),
			...(await buildApiDocPairs(
				expectedPaths.apiOutDir,
				actualPaths.apiOutDir,
			)),
		];
		const mismatches = await findGeneratedDocMismatches(pairs);

		if (mismatches.length > 0) {
			for (const mismatch of mismatches) {
				console.error(
					`[docs:check] ${mismatch.label}: ${mismatch.reason} (${mismatch.expectedPath} <> ${mismatch.actualPath})`,
				);
			}

			throw new Error(
				'Generated docs are stale or missing. Run `pnpm docs:generate`.',
			);
		}

		return pairs;
	} finally {
		await rm(temporaryRoot, {recursive: true, force: true});
	}
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	await checkGeneratedDocs();
}
