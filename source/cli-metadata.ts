/**
 * Canonical CLI name used by runtime help text and generated docs.
 */
export const cliName = 'react-cli-quick-starter';

/**
 * Default fallback name used in greetings and option docs.
 */
export const defaultName = 'Stranger';

type StringCliFlagDefinition = {
	readonly type: 'string';
	readonly description: string;
	readonly default: string;
};

type BooleanCliFlagDefinition = {
	readonly type: 'boolean';
	readonly description: string;
	readonly default: boolean;
};

export type CliFlagDefinition =
	| StringCliFlagDefinition
	| BooleanCliFlagDefinition;

export const cliFlags: {
	readonly name: StringCliFlagDefinition;
	readonly interactive: BooleanCliFlagDefinition;
} = {
	name: {
		type: 'string',
		description: 'Your name',
		default: defaultName,
	},
	interactive: {
		type: 'boolean',
		description: 'Enable interactive mode with keyboard and paste handling',
		default: false,
	},
};

export const cliExamples = [
	`$ ${cliName} --name=Jane`,
	'Hello, Jane',
	`$ ${cliName} --interactive`,
	'Hello, Stranger',
] as const;

export function buildCliHelpText(): string {
	return `
	Usage
	  $ ${cliName}

	Options
	  --name  ${cliFlags.name.description} (default: ${cliFlags.name.default})
	  --interactive  ${cliFlags.interactive.description} (default: ${String(
		cliFlags.interactive.default,
	)})

	Examples
	  ${cliExamples[0]}
	  ${cliExamples[1]}
	`;
}
