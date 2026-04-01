import {pathToFileURL} from 'node:url';
import {describe, expect, it, vi} from 'vitest';
import type {ResolvedCommand} from '../../source/commands/types';
import {isDirectExecution, resolveCommand, runCli} from '../../source/cli';

type CliInstance = Parameters<typeof resolveCommand>[0];

const baseFlags: CliInstance['flags'] = {
	output: './downloads',
	verbose: false,
	resume: true,
	images: true,
	cookies: '',
	limit: 10,
	format: 'human',
	text: '',
	content: '',
};

const unknownParsedUrl = {
	platform: 'unknown',
	type: 'unknown',
	raw: 'unknown',
} as const;

function createCliStub(
	overrides: Partial<CliInstance> & Pick<CliInstance, 'input'>,
): CliInstance {
	return {
		input: overrides.input,
		flags: {
			...baseFlags,
			...overrides.flags,
		},
		showHelp: overrides.showHelp ?? vi.fn(),
	};
}

function createExpectedFlags(
	overrides: Partial<CliInstance['flags']> = {},
): ResolvedCommand['flags'] {
	const flags = {
		...baseFlags,
		...overrides,
	};

	return {
		output: flags.output,
		verbose: flags.verbose,
		resume: flags.resume,
		images: flags.images,
		cookies: flags.cookies || undefined,
	};
}

function createDependencies(parseResult = unknownParsedUrl) {
	const stderrWrites: string[] = [];
	const stderr = {
		write: vi.fn((chunk: string) => {
			stderrWrites.push(chunk);
			return true;
		}),
	};
	const exitMock = vi.fn((code: number) => {
		throw new Error(`exit:${code}`);
	});
	const parseUrlMock = vi.fn((input: string) => {
		void input;
		return parseResult;
	});

	return {
		dependencies: {
			parseUrl: parseUrlMock,
			stderr,
			exit: exitMock as unknown as (code: number) => never,
		},
		exitMock,
		parseUrlMock,
		stderrWrites,
	};
}

describe('resolveCommand', () => {
	it('shows help and resolves help when no input is provided', () => {
		const showHelp = vi.fn();
		const cli = createCliStub({input: [], showHelp});

		expect(resolveCommand(cli)).toEqual({
			command: 'help',
			flags: createExpectedFlags(),
		});
		expect(showHelp).toHaveBeenCalledWith(0);
	});

	it('resolves login without requiring a URL', () => {
		const cli = createCliStub({input: ['login']});

		expect(resolveCommand(cli)).toEqual({
			command: 'login',
			flags: createExpectedFlags(),
		});
	});

	it('resolves x post commands with text fallback and extra args', () => {
		const cli = createCliStub({
			input: ['x', 'post', 'hello-world', 'draft'],
			flags: {
				...baseFlags,
				format: 'json',
			},
		});

		expect(resolveCommand(cli)).toEqual({
			command: 'x-post',
			url: 'hello-world',
			flags: createExpectedFlags(),
			limit: 10,
			format: 'json',
			text: 'hello-world',
			extraArgs: ['draft'],
		});
	});

	it('allows x commands that do not require an argument', () => {
		const cli = createCliStub({
			input: ['x', 'mentions'],
			flags: {
				...baseFlags,
				format: 'json',
			},
		});

		expect(resolveCommand(cli)).toEqual({
			command: 'x-mentions',
			url: undefined,
			flags: createExpectedFlags(),
			limit: 10,
			format: 'json',
			text: undefined,
			extraArgs: [],
		});
	});

	it('maps known bili subcommands and preserves text flags', () => {
		const cli = createCliStub({
			input: ['bili', 'comments', 'BV1xx411c7mD', 'page=2'],
			flags: {
				...baseFlags,
				format: 'json',
				text: 'keep me',
			},
		});

		expect(resolveCommand(cli)).toEqual({
			command: 'bili-comments',
			url: 'BV1xx411c7mD',
			flags: createExpectedFlags({text: 'keep me'}),
			limit: 10,
			format: 'json',
			text: 'keep me',
			extraArgs: ['page=2'],
		});
	});

	it('accepts bili URLs in place of explicit subcommands', () => {
		const cli = createCliStub({
			input: ['bili', 'https://www.bilibili.com/video/BV1xx411c7mD'],
			flags: {
				...baseFlags,
				format: 'json',
			},
		});
		const {dependencies, parseUrlMock} = createDependencies({
			platform: 'bili',
			type: 'video',
			bvid: 'BV1xx411c7mD',
		});

		expect(resolveCommand(cli, dependencies)).toEqual({
			command: 'bili-download',
			url: 'BV1xx411c7mD',
			flags: createExpectedFlags(),
			format: 'json',
		});
		expect(parseUrlMock).toHaveBeenCalledWith(
			'https://www.bilibili.com/video/BV1xx411c7mD',
		);
	});

	it('resolves summary commands with explicit URLs', () => {
		const cli = createCliStub({
			input: ['summary', 'https://example.com/post'],
			flags: {
				...baseFlags,
				format: 'json',
			},
		});

		expect(resolveCommand(cli)).toEqual({
			command: 'summary',
			url: 'https://example.com/post',
			flags: createExpectedFlags(),
			format: 'json',
		});
	});

	it('accepts xhs URLs in place of explicit subcommands', () => {
		const cli = createCliStub({
			input: ['xhs', 'https://www.xiaohongshu.com/explore/abc123'],
			flags: {
				...baseFlags,
				format: 'json',
			},
		});
		const {dependencies, parseUrlMock} = createDependencies({
			platform: 'xhs',
			type: 'note',
			noteId: 'abc123',
		});

		expect(resolveCommand(cli, dependencies)).toEqual({
			command: 'xhs-download',
			url: 'abc123',
			flags: createExpectedFlags(),
			format: 'json',
		});
		expect(parseUrlMock).toHaveBeenCalledWith(
			'https://www.xiaohongshu.com/explore/abc123',
		);
	});

	it('allows browse commands without arguments only for hot and feed', () => {
		expect(resolveCommand(createCliStub({input: ['hot']}))).toEqual({
			command: 'hot',
			url: undefined,
			flags: createExpectedFlags(),
			limit: 10,
		});
		expect(resolveCommand(createCliStub({input: ['feed']}))).toEqual({
			command: 'feed',
			url: undefined,
			flags: createExpectedFlags(),
			limit: 10,
		});
	});

	it('resolves explicit download commands with their URL arguments', () => {
		const cli = createCliStub({
			input: ['article', 'https://zhuanlan.zhihu.com/p/123'],
		});

		expect(resolveCommand(cli)).toEqual({
			command: 'article',
			url: 'https://zhuanlan.zhihu.com/p/123',
			flags: createExpectedFlags(),
			limit: 10,
		});
	});

	it.each([
		{
			name: 'zhihu answers',
			parsed: {
				platform: 'zhihu',
				type: 'answer',
				questionId: '1',
				answerId: '2',
			},
			expected: {
				command: 'answer',
				url: 'https://detected.example/path',
				flags: createExpectedFlags(),
				limit: 10,
			},
		},
		{
			name: 'csdn articles',
			parsed: {
				platform: 'csdn',
				type: 'article',
				url: 'https://blog.csdn.net/post',
			},
			expected: {
				command: 'csdn',
				url: 'https://detected.example/path',
				flags: createExpectedFlags(),
				limit: 10,
			},
		},
		{
			name: 'weixin articles',
			parsed: {
				platform: 'weixin',
				type: 'article',
				url: 'https://mp.weixin.qq.com/s/demo',
			},
			expected: {
				command: 'weixin',
				url: 'https://detected.example/path',
				flags: createExpectedFlags(),
				limit: 10,
			},
		},
		{
			name: 'juejin articles',
			parsed: {
				platform: 'juejin',
				type: 'article',
				url: 'https://juejin.cn/post/demo',
			},
			expected: {
				command: 'juejin',
				url: 'https://detected.example/path',
				flags: createExpectedFlags(),
				limit: 10,
			},
		},
		{
			name: 'x tweets',
			parsed: {
				platform: 'x',
				type: 'tweet',
				tweetId: '123',
				username: 'openai',
			},
			expected: {
				command: 'x-tweet',
				url: 'https://detected.example/path',
				flags: createExpectedFlags(),
				format: 'human',
			},
		},
		{
			name: 'x users',
			parsed: {
				platform: 'x',
				type: 'user',
				username: 'openai',
			},
			expected: {
				command: 'x-user',
				url: 'openai',
				flags: createExpectedFlags(),
				format: 'human',
			},
		},
		{
			name: 'xhs users',
			parsed: {
				platform: 'xhs',
				type: 'user',
				userId: 'abc123',
			},
			expected: {
				command: 'xhs-user',
				url: 'abc123',
				flags: createExpectedFlags(),
				format: 'human',
			},
		},
		{
			name: 'bili users',
			parsed: {
				platform: 'bili',
				type: 'user',
				mid: '10086',
			},
			expected: {
				command: 'bili-user',
				url: '10086',
				flags: createExpectedFlags(),
				format: 'human',
			},
		},
	])('auto-detects $name from raw URLs', ({parsed, expected}) => {
		const cli = createCliStub({input: ['https://detected.example/path']});
		const {dependencies, parseUrlMock} = createDependencies(parsed);

		expect(resolveCommand(cli, dependencies)).toEqual(expected);
		expect(parseUrlMock).toHaveBeenCalledWith('https://detected.example/path');
	});

	it.each([
		{
			name: 'x subcommand is missing',
			cli: createCliStub({input: ['x']}),
			message: 'Error: x requires a subcommand',
		},
		{
			name: 'unknown x subcommand is rejected',
			cli: createCliStub({input: ['x', 'bookmark']}),
			message: 'Error: unknown x subcommand: bookmark',
		},
		{
			name: 'x reply requires an argument',
			cli: createCliStub({input: ['x', 'reply']}),
			message: 'Error: x reply requires an argument',
		},
		{
			name: 'bili subcommand is missing',
			cli: createCliStub({input: ['bili']}),
			message: 'Error: bili requires a subcommand',
		},
		{
			name: 'unknown bili subcommand is rejected',
			cli: createCliStub({input: ['bili', 'unknown']}),
			message: 'Error: unknown bili subcommand: unknown',
		},
		{
			name: 'bili comments require a target',
			cli: createCliStub({input: ['bili', 'comments']}),
			message: 'Error: bili comments requires an argument',
		},
		{
			name: 'summary requires a URL',
			cli: createCliStub({input: ['summary']}),
			message: 'Error: summary requires a URL argument',
		},
		{
			name: 'xhs subcommand is missing',
			cli: createCliStub({input: ['xhs']}),
			message: 'Error: xhs requires a subcommand',
		},
		{
			name: 'unknown xhs subcommand is rejected',
			cli: createCliStub({input: ['xhs', 'unknown']}),
			message: 'Error: unknown xhs subcommand: unknown',
		},
		{
			name: 'xhs comment requires an argument',
			cli: createCliStub({input: ['xhs', 'comment']}),
			message: 'Error: xhs comment requires an argument',
		},
		{
			name: 'question browse requires an argument',
			cli: createCliStub({input: ['question']}),
			message: 'Error: question requires an argument',
		},
		{
			name: 'article downloads require a URL',
			cli: createCliStub({input: ['article']}),
			message: 'Error: article requires a URL argument',
		},
	])('exits when $name', ({cli, message}) => {
		const {dependencies, exitMock, stderrWrites} = createDependencies();

		expect(() => resolveCommand(cli, dependencies)).toThrowError('exit:1');
		expect(exitMock).toHaveBeenCalledWith(1);
		expect(stderrWrites.join('')).toContain(message);
	});

	it('prints the supported-platform message when auto-detection fails', () => {
		const cli = createCliStub({input: ['not-a-supported-url']});
		const {dependencies, exitMock, stderrWrites, parseUrlMock} =
			createDependencies();

		expect(() => resolveCommand(cli, dependencies)).toThrowError('exit:1');
		expect(exitMock).toHaveBeenCalledWith(1);
		expect(parseUrlMock).toHaveBeenCalledWith('not-a-supported-url');
		expect(stderrWrites.join('')).toContain(
			'Error: Could not detect content type from: not-a-supported-url',
		);
		expect(stderrWrites.join('')).toContain(
			'Supported: zhihu, csdn, weixin, juejin, x.com, xiaohongshu.com, bilibili.com URLs or use a subcommand',
		);
	});
});

describe('runCli', () => {
	it('renders App with the resolved command', () => {
		const renderApp = vi.fn();
		const cli = createCliStub({
			input: ['summary', 'https://example.com/post'],
			flags: {
				...baseFlags,
				format: 'json',
			},
		});

		runCli({cli, renderApp});

		expect(renderApp).toHaveBeenCalledTimes(1);
		const [tree] = renderApp.mock.calls[0]!;
		expect(tree.props.resolved).toEqual({
			command: 'summary',
			url: 'https://example.com/post',
			flags: createExpectedFlags(),
			format: 'json',
		});
	});
});

describe('isDirectExecution', () => {
	it('matches the current module URL against argv[1]', () => {
		const entryPath = 'D:\\Project\\zget-cli\\source\\cli.tsx';

		expect(
			isDirectExecution(['node', entryPath], pathToFileURL(entryPath).href),
		).toBe(true);
	});

	it('returns false when argv[1] points to a different file', () => {
		expect(
			isDirectExecution(
				['node', 'D:\\Project\\zget-cli\\source\\other.ts'],
				pathToFileURL('D:\\Project\\zget-cli\\source\\cli.tsx').href,
			),
		).toBe(false);
	});
});
