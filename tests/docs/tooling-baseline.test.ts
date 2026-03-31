import {describe, expect, it} from 'vitest';
import {buildToolingBaselineMarkdown} from '../../tools/docs/tooling-baseline';

describe('tooling baseline generation', () => {
	it('renders pinned tooling versions and upstream references', () => {
		const markdown = buildToolingBaselineMarkdown();

		expect(markdown).toContain('# Tooling Baseline');
		expect(markdown).toContain('TypeDoc');
		expect(markdown).toContain('0.28.17');
		expect(markdown).toContain('Vitest');
		expect(markdown).toContain('4.1.0');
		expect(markdown).toContain('typedoc-plugin-markdown');
	});

	it('matches the committed tooling baseline snapshot', () => {
		expect(buildToolingBaselineMarkdown()).toMatchInlineSnapshot(`
			"# Tooling Baseline

			## Documentation Generation

			| Package | Version | Upstream |
			| --- | --- | --- |
			| TypeDoc | 0.28.17 | https://typedoc.org/documents/Options.Input.html |
			| typedoc-plugin-markdown | 4.10.0 | https://typedoc-plugin-markdown.org/docs/options |

			## Testing

			| Package | Version | Upstream |
			| --- | --- | --- |
			| Vitest | 4.1.0 | https://vitest.dev/guide/coverage |
			| @vitest/coverage-v8 | 4.1.0 | https://vitest.dev/config/coverage |
			| ink-testing-library | 4.0.0 | https://github.com/vadimdemedes/ink-testing-library |
			| tsx | 4.21.0 | https://github.com/privatenumber/tsx |
			"
		`);
	});
});
