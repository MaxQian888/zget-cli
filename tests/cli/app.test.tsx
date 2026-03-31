import {Text} from 'ink';
import {render} from 'ink-testing-library';
import {describe, expect, it, vi} from 'vitest';
import App from '../../source/app';

function mockCommand(label: string) {
	return {
		default(props: Record<string, unknown>) {
			return <Text>{`${label}:${JSON.stringify(props)}`}</Text>;
		},
	};
}

vi.mock('../../source/commands/download', () => mockCommand('download'));
vi.mock('../../source/commands/browse', () => mockCommand('browse'));
vi.mock('../../source/commands/x-browse', () => mockCommand('x-browse'));
vi.mock('../../source/commands/summary', () => mockCommand('summary'));

type ResolvedCommand = Parameters<typeof App>[0]['resolved'];

const baseFlags = {
	output: './downloads',
	verbose: false,
	resume: true,
	images: true,
} satisfies ResolvedCommand['flags'];

function createResolved(
	overrides: Partial<ResolvedCommand> & Pick<ResolvedCommand, 'command'>,
): ResolvedCommand {
	return {
		command: overrides.command,
		flags: baseFlags,
		...overrides,
	};
}

describe('App routing', () => {
	it('routes Zhihu downloads through DownloadCommand', () => {
		const resolved = createResolved({
			command: 'article',
			url: 'https://zhuanlan.zhihu.com/p/123',
		});
		const {lastFrame} = render(<App resolved={resolved} />);

		expect(lastFrame()).toContain('download:');
		expect(lastFrame()).toContain('"type":"article"');
		expect(lastFrame()).toContain('"url":"https://zhuanlan.zhihu.com/p/123"');
	});

	it('routes browse commands with limit and format props', () => {
		const resolved = createResolved({
			command: 'x-search',
			url: 'openai',
			limit: 5,
			format: 'json',
		});
		const {lastFrame} = render(<App resolved={resolved} />);

		expect(lastFrame()).toContain('x-browse:');
		expect(lastFrame()).toContain('"browseType":"x-search"');
		expect(lastFrame()).toContain('"query":"openai"');
		expect(lastFrame()).toContain('"limit":5');
		expect(lastFrame()).toContain('"format":"json"');
	});

	it('routes summary requests through SummaryCommand', () => {
		const resolved = createResolved({
			command: 'summary',
			url: 'https://example.com/post',
			format: 'json',
		});
		const {lastFrame} = render(<App resolved={resolved} />);

		expect(lastFrame()).toContain('summary:');
		expect(lastFrame()).toContain('"url":"https://example.com/post"');
		expect(lastFrame()).toContain('"format":"json"');
	});

	it('renders an explicit fallback for unsupported commands', () => {
		const resolved = createResolved({
			command: 'help' as ResolvedCommand['command'],
		});
		const {lastFrame} = render(<App resolved={resolved} />);

		expect(lastFrame()).toContain('Unknown command:');
		expect(lastFrame()).toContain('help');
	});
});
