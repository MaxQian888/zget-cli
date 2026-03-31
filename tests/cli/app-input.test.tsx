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

vi.mock('../../source/commands/x-interact', () => mockCommand('x-interact'));
vi.mock('../../source/commands/xhs-login', () => mockCommand('xhs-login'));
vi.mock('../../source/commands/bili-browse', () => mockCommand('bili-browse'));
vi.mock('../../source/commands/bili-download', () =>
	mockCommand('bili-download'),
);

type ResolvedCommand = Parameters<typeof App>[0]['resolved'];

const baseFlags = {
	output: './downloads',
	verbose: false,
	resume: true,
	images: true,
	cookies: 'SESSDATA=value',
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

describe('App grouped route forwarding', () => {
	it('routes X interaction commands with text fallback target', () => {
		const resolved = createResolved({
			command: 'x-post',
			text: 'hello world',
			format: 'json',
		});
		const {lastFrame} = render(<App resolved={resolved} />);

		expect(lastFrame()).toContain('x-interact:');
		expect(lastFrame()).toContain('"interactType":"x-post"');
		expect(lastFrame()).toContain('"target":"hello world"');
		expect(lastFrame()).toContain('"text":"hello world"');
		expect(lastFrame()).toContain('"format":"json"');
	});

	it('routes XHS auth commands with mode and format', () => {
		const resolved = createResolved({
			command: 'xhs-whoami',
			format: 'json',
		});
		const {lastFrame} = render(<App resolved={resolved} />);

		expect(lastFrame()).toContain('xhs-login:');
		expect(lastFrame()).toContain('"mode":"xhs-whoami"');
		expect(lastFrame()).toContain('"format":"json"');
	});

	it('routes Bilibili browse commands with query and limit', () => {
		const resolved = createResolved({
			command: 'bili-video',
			url: 'BV1xx411c7mD',
			limit: 3,
			format: 'json',
		});
		const {lastFrame} = render(<App resolved={resolved} />);

		expect(lastFrame()).toContain('bili-browse:');
		expect(lastFrame()).toContain('"browseType":"bili-video"');
		expect(lastFrame()).toContain('"query":"BV1xx411c7mD"');
		expect(lastFrame()).toContain('"limit":3');
		expect(lastFrame()).toContain('"format":"json"');
	});

	it('routes Bilibili downloads with the resolved bvid', () => {
		const resolved = createResolved({
			command: 'bili-download',
			url: 'BV1xx411c7mD',
		});
		const {lastFrame} = render(<App resolved={resolved} />);

		expect(lastFrame()).toContain('bili-download:');
		expect(lastFrame()).toContain('"bvid":"BV1xx411c7mD"');
	});
});
