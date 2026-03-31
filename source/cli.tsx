#!/usr/bin/env node
import process from 'node:process';
import meow from 'meow';
import {render, renderToString} from 'ink';
import App from './app.js';
import {buildCliHelpText, cliFlags} from './cli-metadata.js';

const cli = meow(buildCliHelpText(), {
	importMeta: import.meta,
	flags: {
		name: {
			type: cliFlags.name.type,
			default: cliFlags.name.default,
		},
		interactive: {
			type: cliFlags.interactive.type,
			default: cliFlags.interactive.default,
		},
	},
});

if (cli.flags.interactive && process.stdout.isTTY) {
	render(<App isInteractive name={cli.flags.name} />);
} else {
	const output = renderToString(<App name={cli.flags.name} />);
	process.stdout.write(`${output}\n`);
}
