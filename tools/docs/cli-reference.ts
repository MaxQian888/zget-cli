import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {
	buildCliHelpText,
	cliFlags,
	cliName,
} from '../../source/cli-metadata.ts';

type OptionRow = {
	readonly option: string;
	readonly type: string;
	readonly defaultValue: boolean | number | string;
	readonly description: string;
};

function formatDefault(value: OptionRow['defaultValue']): string {
	if (value === '') {
		return '(empty)';
	}

	return String(value);
}

const optionRows: OptionRow[] = [
	{
		option: '--output, -o',
		type: cliFlags.output.type,
		defaultValue: cliFlags.output.default,
		description: cliFlags.output.description,
	},
	{
		option: '--limit, -l',
		type: cliFlags.limit.type,
		defaultValue: cliFlags.limit.default,
		description: cliFlags.limit.description,
	},
	{
		option: '--format, -f',
		type: cliFlags.format.type,
		defaultValue: cliFlags.format.default,
		description: cliFlags.format.description,
	},
	{
		option: '--text, -t',
		type: cliFlags.text.type,
		defaultValue: cliFlags.text.default,
		description: cliFlags.text.description,
	},
	{
		option: '--verbose, -v',
		type: cliFlags.verbose.type,
		defaultValue: cliFlags.verbose.default,
		description: cliFlags.verbose.description,
	},
	{
		option: '--resume',
		type: cliFlags.resume.type,
		defaultValue: cliFlags.resume.default,
		description: cliFlags.resume.description,
	},
	{
		option: '--images / --no-images',
		type: cliFlags.images.type,
		defaultValue: cliFlags.images.default,
		description: 'Download images locally (use --no-images to skip downloads)',
	},
	{
		option: '--cookies',
		type: cliFlags.cookies.type,
		defaultValue: cliFlags.cookies.default,
		description: cliFlags.cookies.description,
	},
	{
		option: '--image',
		type: 'string[]',
		defaultValue: cliFlags.image.default,
		description: cliFlags.image.description,
	},
	{
		option: '--content',
		type: cliFlags.content.type,
		defaultValue: cliFlags.content.default,
		description: cliFlags.content.description,
	},
];

export function buildCliReferenceMarkdown(): string {
	const optionsTable = optionRows
		.map(
			option =>
				`| \`${option.option}\` | \`${option.type}\` | \`${formatDefault(
					option.defaultValue,
				)}\` | ${option.description} |`,
		)
		.join('\n');

	return `# CLI Reference

## Primary Usage

\`\`\`bash
$ ${cliName} <url>
\`\`\`

## Runtime Help

\`\`\`text
${buildCliHelpText().trim()}
\`\`\`

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
${optionsTable}
`;
}

export async function writeCliReferenceFile(outputPath: string): Promise<void> {
	await mkdir(path.dirname(outputPath), {recursive: true});
	await writeFile(outputPath, buildCliReferenceMarkdown(), 'utf8');
}
