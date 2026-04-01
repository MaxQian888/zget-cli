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
vi.mock('../../source/commands/column', () => mockCommand('column'));
vi.mock('../../source/commands/user', () => mockCommand('user'));
vi.mock('../../source/commands/login', () => mockCommand('login'));
vi.mock('../../source/commands/browse', () => mockCommand('browse'));
vi.mock('../../source/commands/platform-download', () =>
	mockCommand('platform-download'),
);
vi.mock('../../source/commands/x-browse', () => mockCommand('x-browse'));
vi.mock('../../source/commands/x-interact', () => mockCommand('x-interact'));
vi.mock('../../source/commands/x-download', () => mockCommand('x-download'));
vi.mock('../../source/commands/x-login', () => mockCommand('x-login'));
vi.mock('../../source/commands/xhs-browse', () => mockCommand('xhs-browse'));
vi.mock('../../source/commands/xhs-interact', () =>
	mockCommand('xhs-interact'),
);
vi.mock('../../source/commands/xhs-download', () =>
	mockCommand('xhs-download'),
);
vi.mock('../../source/commands/xhs-login', () => mockCommand('xhs-login'));
vi.mock('../../source/commands/xhs-publish', () => mockCommand('xhs-publish'));
vi.mock('../../source/commands/bili-browse', () => mockCommand('bili-browse'));
vi.mock('../../source/commands/bili-interact', () =>
	mockCommand('bili-interact'),
);
vi.mock('../../source/commands/bili-download', () =>
	mockCommand('bili-download'),
);
vi.mock('../../source/commands/bili-login', () => mockCommand('bili-login'));
vi.mock('../../source/commands/summary', () => mockCommand('summary'));

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

const routeCases = [
	{
		name: 'Zhihu downloads through DownloadCommand',
		resolved: createResolved({
			command: 'article',
			url: 'https://zhuanlan.zhihu.com/p/123',
		}),
		label: 'download',
		fragments: ['"type":"article"', '"url":"https://zhuanlan.zhihu.com/p/123"'],
	},
	{
		name: 'column downloads through ColumnCommand',
		resolved: createResolved({
			command: 'column',
			url: 'https://www.zhihu.com/column/tester',
		}),
		label: 'column',
		fragments: ['"url":"https://www.zhihu.com/column/tester"'],
	},
	{
		name: 'user downloads through UserCommand',
		resolved: createResolved({
			command: 'user',
			url: 'openai-user',
		}),
		label: 'user',
		fragments: ['"url":"openai-user"'],
	},
	{
		name: 'platform downloads through PlatformDownloadCommand',
		resolved: createResolved({
			command: 'weixin',
			url: 'https://mp.weixin.qq.com/s/example',
		}),
		label: 'platform-download',
		fragments: [
			'"platform":"weixin"',
			'"url":"https://mp.weixin.qq.com/s/example"',
		],
	},
	{
		name: 'CSDN downloads through PlatformDownloadCommand',
		resolved: createResolved({
			command: 'csdn',
			url: 'https://blog.csdn.net/openai/article/details/123',
		}),
		label: 'platform-download',
		fragments: [
			'"platform":"csdn"',
			'"url":"https://blog.csdn.net/openai/article/details/123"',
		],
	},
	{
		name: 'Juejin downloads through PlatformDownloadCommand',
		resolved: createResolved({
			command: 'juejin',
			url: 'https://juejin.cn/post/123',
		}),
		label: 'platform-download',
		fragments: ['"platform":"juejin"', '"url":"https://juejin.cn/post/123"'],
	},
	{
		name: 'auth commands through LoginCommand',
		resolved: createResolved({
			command: 'login',
		}),
		label: 'login',
		fragments: ['"output":"./downloads"', '"resume":true'],
	},
	{
		name: 'Zhihu browse commands through BrowseCommand',
		resolved: createResolved({
			command: 'question',
			url: '为什么要写测试',
			limit: 6,
		}),
		label: 'browse',
		fragments: [
			'"browseType":"question"',
			'"query":"为什么要写测试"',
			'"limit":6',
		],
	},
	{
		name: 'X browse commands through XBrowseCommand',
		resolved: createResolved({
			command: 'x-search',
			url: 'openai',
			limit: 5,
			format: 'json',
		}),
		label: 'x-browse',
		fragments: [
			'"browseType":"x-search"',
			'"query":"openai"',
			'"limit":5',
			'"format":"json"',
		],
	},
	{
		name: 'X interact commands with text fallback target',
		resolved: createResolved({
			command: 'x-post',
			text: 'hello world',
			format: 'json',
		}),
		label: 'x-interact',
		fragments: [
			'"interactType":"x-post"',
			'"target":"hello world"',
			'"text":"hello world"',
			'"format":"json"',
		],
	},
	{
		name: 'X downloads through XDownloadCommand',
		resolved: createResolved({
			command: 'x-tweet',
			url: 'https://x.com/openai/status/123456',
		}),
		label: 'x-download',
		fragments: ['"url":"https://x.com/openai/status/123456"'],
	},
	{
		name: 'X auth through XLoginCommand',
		resolved: createResolved({
			command: 'x-login',
		}),
		label: 'x-login',
		fragments: ['"output":"./downloads"'],
	},
	{
		name: 'XHS browse commands through XhsBrowseCommand',
		resolved: createResolved({
			command: 'xhs-user',
			url: 'abc123',
			limit: 4,
			format: 'json',
		}),
		label: 'xhs-browse',
		fragments: [
			'"browseType":"xhs-user"',
			'"query":"abc123"',
			'"limit":4',
			'"format":"json"',
		],
	},
	{
		name: 'XHS interact commands through XhsInteractCommand',
		resolved: createResolved({
			command: 'xhs-comment',
			url: 'note-123',
			text: 'nice-note',
			format: 'json',
		}),
		label: 'xhs-interact',
		fragments: [
			'"interactType":"xhs-comment"',
			'"target":"note-123"',
			'"text":"nice-note"',
			'"format":"json"',
		],
	},
	{
		name: 'XHS downloads through XhsDownloadCommand',
		resolved: createResolved({
			command: 'xhs-download',
			url: 'note-123',
		}),
		label: 'xhs-download',
		fragments: ['"noteId":"note-123"'],
	},
	{
		name: 'XHS auth commands through XhsLoginCommand',
		resolved: createResolved({
			command: 'xhs-whoami',
			format: 'json',
		}),
		label: 'xhs-login',
		fragments: ['"mode":"xhs-whoami"', '"format":"json"'],
	},
	{
		name: 'XHS publish commands through XhsPublishCommand',
		resolved: createResolved({
			command: 'xhs-post',
			url: '测试标题',
			text: '正文内容',
			format: 'json',
		}),
		label: 'xhs-publish',
		fragments: [
			'"title":"测试标题"',
			'"content":"正文内容"',
			'"format":"json"',
		],
	},
	{
		name: 'Bilibili browse commands through BiliBrowseCommand',
		resolved: createResolved({
			command: 'bili-video',
			url: 'BV1xx411c7mD',
			limit: 3,
			format: 'json',
		}),
		label: 'bili-browse',
		fragments: [
			'"browseType":"bili-video"',
			'"query":"BV1xx411c7mD"',
			'"limit":3',
			'"format":"json"',
		],
	},
	{
		name: 'Bilibili interact commands through BiliInteractCommand',
		resolved: createResolved({
			command: 'bili-like',
			url: 'BV1xx411c7mD',
			format: 'json',
		}),
		label: 'bili-interact',
		fragments: [
			'"interactType":"bili-like"',
			'"target":"BV1xx411c7mD"',
			'"format":"json"',
		],
	},
	{
		name: 'Bilibili downloads through BiliDownloadCommand',
		resolved: createResolved({
			command: 'bili-download',
			url: 'BV1xx411c7mD',
		}),
		label: 'bili-download',
		fragments: ['"bvid":"BV1xx411c7mD"'],
	},
	{
		name: 'Bilibili auth commands through BiliLoginCommand',
		resolved: createResolved({
			command: 'bili-whoami',
			format: 'json',
		}),
		label: 'bili-login',
		fragments: ['"mode":"bili-whoami"', '"format":"json"'],
	},
	{
		name: 'summary requests through SummaryCommand',
		resolved: createResolved({
			command: 'summary',
			url: 'https://example.com/post',
			format: 'json',
		}),
		label: 'summary',
		fragments: ['"url":"https://example.com/post"', '"format":"json"'],
	},
] satisfies Array<{
	name: string;
	resolved: ResolvedCommand;
	label: string;
	fragments: string[];
}>;

describe('App routing', () => {
	it.each(routeCases)('routes $name', ({resolved, label, fragments}) => {
		const {lastFrame} = render(<App resolved={resolved} />);
		const frame = lastFrame();
		const normalizedFrame = frame.replace(/\s+/g, '');

		expect(normalizedFrame).toContain(`${label}:`);

		for (const fragment of fragments) {
			expect(normalizedFrame).toContain(fragment.replace(/\s+/g, ''));
		}
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
