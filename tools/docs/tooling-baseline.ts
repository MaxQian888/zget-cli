import {mkdir, writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';

type PackageManifest = {
	readonly dependencies?: Record<string, string>;
	readonly devDependencies?: Record<string, string>;
};

function readPackageManifest(): PackageManifest {
	const manifestPath = new URL('../../package.json', import.meta.url);
	return JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
}

function readVersion(packageName: string): string {
	const manifest = readPackageManifest();
	return (
		manifest.devDependencies?.[packageName] ??
		manifest.dependencies?.[packageName] ??
		'not-installed'
	);
}

export function buildToolingBaselineMarkdown(): string {
	return `# Tooling Baseline

## Documentation Generation

| Package | Version | Upstream |
| --- | --- | --- |
| TypeDoc | ${readVersion(
		'typedoc',
	)} | https://typedoc.org/documents/Options.Input.html |
| typedoc-plugin-markdown | ${readVersion(
		'typedoc-plugin-markdown',
	)} | https://typedoc-plugin-markdown.org/docs/options |

## Testing

| Package | Version | Upstream |
| --- | --- | --- |
| Vitest | ${readVersion('vitest')} | https://vitest.dev/guide/coverage |
| @vitest/coverage-v8 | ${readVersion(
		'@vitest/coverage-v8',
	)} | https://vitest.dev/config/coverage |
| ink-testing-library | ${readVersion(
		'ink-testing-library',
	)} | https://github.com/vadimdemedes/ink-testing-library |
| tsx | ${readVersion('tsx')} | https://github.com/privatenumber/tsx |
`;
}

export async function writeToolingBaselineFile(
	outputPath: string,
): Promise<void> {
	await mkdir(path.dirname(outputPath), {recursive: true});
	await writeFile(outputPath, buildToolingBaselineMarkdown(), 'utf8');
}
