import {describe, expect, it} from 'vitest';
import {buildCliHelpText, cliFlags, cliName} from '../../source/cli-metadata';

describe('cli metadata', () => {
	it('builds help text from the shared CLI contract', () => {
		const helpText = buildCliHelpText();

		expect(helpText).toContain(`$ ${cliName} <url>`);
		expect(helpText).toContain(
			`$ ${cliName} xhs post "<title>" --image photo.jpg`,
		);
		expect(helpText).toContain(`$ ${cliName} bili login`);
		expect(helpText).toContain('--format, -f');
		expect(helpText).toContain('--no-images');
	});

	it('exposes current option defaults and metadata for docs/runtime usage', () => {
		expect(cliFlags.output.type).toBe('string');
		expect(cliFlags.output.default).toBe('./downloads');
		expect(cliFlags.limit.type).toBe('number');
		expect(cliFlags.limit.default).toBe(10);
		expect(cliFlags.format.type).toBe('string');
		expect(cliFlags.format.default).toBe('human');
		expect(cliFlags.image.isMultiple).toBe(true);
	});
});
