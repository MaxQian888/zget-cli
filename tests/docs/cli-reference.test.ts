import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {buildCliHelpText, cliName} from '../../source/cli-metadata';
import {buildCliReferenceMarkdown} from '../../tools/docs/cli-reference';

describe('cli reference generation', () => {
	it('renders usage, examples, and option defaults into markdown', () => {
		const markdown = buildCliReferenceMarkdown();

		expect(markdown).toContain('# CLI Reference');
		expect(markdown).toContain('## Runtime Help');
		expect(markdown).toContain(`$ ${cliName} <url>`);
		expect(markdown).toContain('| `--output, -o` | `string` | `./downloads` |');
		expect(markdown).toContain(
			'| `--images / --no-images` | `boolean` | `true` |',
		);
		expect(markdown).toContain(
			'| `--image` | `string[]` | `(empty)` | Image path for XHS publish (can repeat) |',
		);
		expect(markdown).toContain(buildCliHelpText().trim());
	});

	it('matches the committed CLI reference file', () => {
		const committedMarkdown = readFileSync(
			new URL('../../docs/reference/cli.md', import.meta.url),
			'utf8',
		);

		expect(buildCliReferenceMarkdown()).toBe(committedMarkdown);
	});
});
