import {describe, expect, it} from 'vitest';
import {
	buildCliHelpText,
	cliFlags,
	cliName,
	defaultName,
} from '../../source/cli-metadata';

describe('cli metadata', () => {
	it('builds help text from the shared CLI contract', () => {
		const helpText = buildCliHelpText();

		expect(helpText).toContain(`$ ${cliName}`);
		expect(helpText).toContain('--name  Your name');
		expect(helpText).toContain('--interactive  Enable interactive mode');
		expect(helpText).toContain(`default: ${defaultName}`);
	});

	it('exposes the name flag default and type for docs and runtime usage', () => {
		expect(cliFlags.name.type).toBe('string');
		expect(cliFlags.name.default).toBe(defaultName);
		expect(cliFlags.interactive.type).toBe('boolean');
		expect(cliFlags.interactive.default).toBe(false);
	});
});
