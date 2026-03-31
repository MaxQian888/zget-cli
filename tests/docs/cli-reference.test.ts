import {describe, expect, it} from 'vitest';
import {buildCliReferenceMarkdown} from '../../tools/docs/cli-reference';

describe('cli reference generation', () => {
	it('renders usage, examples, and option defaults into markdown', () => {
		const markdown = buildCliReferenceMarkdown();

		expect(markdown).toContain('# CLI Reference');
		expect(markdown).toContain('## Usage');
		expect(markdown).toContain('| `--name` | `string` | `Stranger` |');
		expect(markdown).toContain('| `--interactive` | `boolean` | `false` |');
		expect(markdown).toContain('Hello, Jane');
	});

	it('matches the committed CLI reference snapshot', () => {
		expect(buildCliReferenceMarkdown()).toMatchInlineSnapshot(`
			"# CLI Reference

			## Usage

			\`\`\`bash
			$ react-cli-quick-starter
			\`\`\`

			## Options

			| Option | Type | Default | Description |
			| --- | --- | --- | --- |
			| \`--name\` | \`string\` | \`Stranger\` | Your name |
			| \`--interactive\` | \`boolean\` | \`false\` | Enable interactive mode with keyboard and paste handling |

			## Examples

			\`\`\`text
			$ react-cli-quick-starter --name=Jane
			Hello, Jane
			$ react-cli-quick-starter --interactive
			Hello, Stranger
			\`\`\`
			"
		`);
	});
});
