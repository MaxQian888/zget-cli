import process from 'node:process';
import {resolve as resolvePath} from 'node:path';
import {pathToFileURL} from 'node:url';
import meow, {type Result} from 'meow';
import {render} from 'ink';
import App from './app';
import {buildCliHelpText, cliFlags} from './cli-metadata';
import {parseUrl, type ParsedUrl} from './core/utils/url-parser';
import type {ResolvedCommand} from './commands/types';

const cliParserFlags = {
	output: {
		type: cliFlags.output.type,
		alias: 'o',
		default: cliFlags.output.default,
	},
	verbose: {
		type: cliFlags.verbose.type,
		alias: 'v',
		default: cliFlags.verbose.default,
	},
	resume: {
		type: cliFlags.resume.type,
		default: cliFlags.resume.default,
	},
	images: {
		type: cliFlags.images.type,
		default: cliFlags.images.default,
	},
	image: {
		type: cliFlags.image.type,
		isMultiple: true as const,
	},
	cookies: {
		type: cliFlags.cookies.type,
		default: cliFlags.cookies.default,
	},
	limit: {
		type: 'number' as const,
		alias: 'l',
		default: cliFlags.limit.default,
	},
	format: {
		type: 'string' as const,
		alias: 'f',
		default: cliFlags.format.default,
	},
	text: {
		type: 'string' as const,
		alias: 't',
		default: cliFlags.text.default,
	},
	content: {
		type: 'string' as const,
		default: cliFlags.content.default,
	},
	cookie: {
		type: 'string' as const,
		default: cliFlags.cookie.default,
	},
	detail: {
		type: 'string' as const,
		alias: 'd',
		default: cliFlags.detail.default,
	},
	topic: {
		type: 'string' as const,
		isMultiple: true as const,
	},
	neutral: {
		type: 'boolean' as const,
		default: cliFlags.neutral.default,
	},
	unfollow: {
		type: 'boolean' as const,
		default: cliFlags.unfollow.default,
	},
	reply: {
		type: 'string' as const,
		default: cliFlags.reply.default,
	},
	yes: {
		type: 'boolean' as const,
		alias: 'y',
		default: cliFlags.yes.default,
	},
	type: {
		type: 'string' as const,
		default: cliFlags.type.default,
	},
	sort: {
		type: 'string' as const,
		default: cliFlags.sort.default,
	},
	comments: {
		type: 'boolean' as const,
		default: cliFlags.comments.default,
	},
	questions: {
		type: 'boolean' as const,
		default: cliFlags.questions.default,
	},
	offset: {
		type: 'number' as const,
		default: cliFlags.offset.default,
	},
};

type CliParserFlags = typeof cliParserFlags;

export type CliInstance = Pick<
	Result<CliParserFlags>,
	'input' | 'flags' | 'showHelp'
>;

type ResolveCommandDependencies = {
	parseUrl: (input: string) => ParsedUrl;
	stderr: Pick<typeof process.stderr, 'write'>;
	exit: (code: number) => never;
};

type RunCliOptions = {
	readonly cli?: CliInstance;
	readonly renderApp?: (tree: Parameters<typeof render>[0]) => unknown;
	readonly dependencies?: Partial<ResolveCommandDependencies>;
	readonly isInteractiveTerminal?: () => boolean;
};

const cliFlagEntries: Array<
	[string, (typeof cliFlags)[keyof typeof cliFlags]]
> = Object.entries(cliFlags);

const cliLongFlagTokens = new Map(
	cliFlagEntries.flatMap(([name, definition]) => {
		const tokens: Array<[string, boolean]> = [
			[`--${name}`, definition.type !== 'boolean'],
		];
		if (definition.type === 'boolean') {
			tokens.push([`--no-${name}`, false]);
		}

		if ('shortFlag' in definition && typeof definition.shortFlag === 'string') {
			const shortFlag = String(definition.shortFlag);
			tokens.push(['-' + shortFlag, definition.type !== 'boolean']);
		}

		return tokens;
	}),
);

function normalizeCliArgv(argv: string[]): string[] {
	const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv;
	const flagArgs: string[] = [];
	const inputArgs: string[] = [];

	for (let index = 0; index < normalizedArgv.length; index += 1) {
		const token = normalizedArgv[index]!;
		const flagDefinition = cliLongFlagTokens.get(token);
		if (flagDefinition === undefined) {
			inputArgs.push(token);
			continue;
		}

		flagArgs.push(token);
		if (flagDefinition && normalizedArgv[index + 1] !== undefined) {
			flagArgs.push(normalizedArgv[index + 1]!);
			index += 1;
		}
	}

	return [...flagArgs, ...inputArgs];
}

export function createCli(argv = process.argv.slice(2)): CliInstance {
	return meow<CliParserFlags>(buildCliHelpText(), {
		importMeta: import.meta,
		flags: cliParserFlags,
		argv: normalizeCliArgv(argv),
	});
}

const downloadCommands = new Set([
	'article',
	'answer',
	'video',
	'column',
	'user',
	'csdn',
	'weixin',
	'juejin',
]);
const browseCommands = new Set([
	'search',
	'hot',
	'question',
	'answers',
	'feed',
	'topic',
	'user-info',
	'user-answers',
	'user-articles',
]);

function exitWithError(
	message: string,
	stderr: Pick<typeof process.stderr, 'write'>,
	exit: (code: number) => never,
): never {
	stderr.write(message);
	return exit(1);
}

type ZhihuSubcommandContext = {
	flags: ResolvedCommand['flags'];
	format: 'human' | 'json';
	limit?: number;
	offset?: number;
	text?: string;
	content?: string;
	images?: string[];
	cookie?: string;
	detail?: string;
	topics?: string[];
	neutral: boolean;
	unfollow: boolean;
	reply?: string;
	yes: boolean;
};

const zhihuFollowTargets = new Set(['user', 'question', 'column']);

// eslint-disable-next-line complexity
function resolveZhihuSubcommand(
	input: string[],
	context: ZhihuSubcommandContext,
	stderr: Pick<typeof process.stderr, 'write'>,
	exit: (code: number) => never,
): ResolvedCommand {
	const sub = input[1];
	const arg1 = input[2];
	const arg2 = input[3];
	const {
		flags,
		format,
		limit,
		offset,
		text,
		content,
		images,
		cookie,
		detail,
		topics,
		neutral,
		unfollow,
		reply,
		yes,
	} = context;

	const baseExtras = (extra: string[] = []) => ({
		flags,
		format,
		limit,
		offset,
		extraArgs: extra,
	});

	if (!sub) {
		exitWithError(
			'Error: zhihu requires a subcommand (login, vote, follow, ask, …)\n',
			stderr,
			exit,
		);
	}

	switch (sub) {
		case 'login': {
			return {command: 'zhihu-login', ...baseExtras(), cookie};
		}

		case 'logout': {
			return {command: 'zhihu-logout', ...baseExtras()};
		}

		case 'whoami': {
			return {command: 'zhihu-whoami', ...baseExtras()};
		}

		case 'status': {
			return {command: 'zhihu-status', ...baseExtras()};
		}

		case 'vote': {
			if (!arg1) {
				exitWithError(
					'Error: zhihu vote requires an answer ID\n',
					stderr,
					exit,
				);
			}

			return {
				command: 'zhihu-vote',
				url: arg1,
				...baseExtras(),
				neutral,
			};
		}

		case 'follow':
		case 'unfollow': {
			if (!arg1 || !arg2 || !zhihuFollowTargets.has(arg1)) {
				exitWithError(
					'Error: zhihu follow {user|question|column} <id>\n',
					stderr,
					exit,
				);
			}

			return {
				command:
					sub === 'unfollow' || unfollow ? 'zhihu-unfollow' : 'zhihu-follow',
				url: arg2,
				extraArgs: [arg1],
				flags,
				format,
				limit,
				offset,
			};
		}

		case 'comment': {
			if (!arg1) {
				exitWithError(
					'Error: zhihu comment requires a target ID\n',
					stderr,
					exit,
				);
			}

			if (!text) {
				exitWithError(
					'Error: zhihu comment requires -t "<text>"\n',
					stderr,
					exit,
				);
			}

			return {
				command: 'zhihu-comment',
				url: arg1,
				...baseExtras(),
				text,
				reply,
			};
		}

		case 'comments': {
			if (!arg1) {
				exitWithError(
					'Error: zhihu comments requires a target ID\n',
					stderr,
					exit,
				);
			}

			return {command: 'zhihu-comments', url: arg1, ...baseExtras()};
		}

		case 'uncomment': {
			if (!arg1) {
				exitWithError(
					'Error: zhihu uncomment requires a comment ID\n',
					stderr,
					exit,
				);
			}

			return {command: 'zhihu-uncomment', url: arg1, ...baseExtras()};
		}

		case 'followers':
		case 'following':
		case 'collections': {
			if (!arg1) {
				exitWithError(
					`Error: zhihu ${sub} requires a user token\n`,
					stderr,
					exit,
				);
			}

			return {
				command: `zhihu-${sub}` as ResolvedCommand['command'],
				url: arg1,
				...baseExtras(),
			};
		}

		case 'notifications': {
			return {command: 'zhihu-notifications', ...baseExtras()};
		}

		case 'drafts': {
			return {command: 'zhihu-drafts', ...baseExtras()};
		}

		case 'ask': {
			if (!arg1) {
				exitWithError(
					'Error: zhihu ask requires a title argument\n',
					stderr,
					exit,
				);
			}

			return {
				command: 'zhihu-ask',
				url: arg1,
				...baseExtras(),
				detail,
				topics,
				images,
			};
		}

		case 'pin': {
			if (!arg1) {
				exitWithError(
					'Error: zhihu pin requires a title argument\n',
					stderr,
					exit,
				);
			}

			return {
				command: 'zhihu-pin',
				url: arg1,
				...baseExtras(),
				content,
				images,
			};
		}

		case 'publish-article': {
			if (!arg1 || !arg2) {
				exitWithError(
					'Error: zhihu publish-article requires "<title>" "<content>"\n',
					stderr,
					exit,
				);
			}

			return {
				command: 'zhihu-publish-article',
				url: arg1,
				...baseExtras(),
				content: arg2,
				topics,
				images,
			};
		}

		case 'delete-question':
		case 'delete-pin':
		case 'delete-article': {
			if (!arg1) {
				exitWithError(`Error: zhihu ${sub} requires an ID\n`, stderr, exit);
			}

			return {
				command: `zhihu-${sub}` as ResolvedCommand['command'],
				url: arg1,
				...baseExtras(),
				yes,
			};
		}

		default: {
			exitWithError(`Error: unknown zhihu subcommand: ${sub}\n`, stderr, exit);
		}
	}
}

// The CLI routes many command families in one place, so keeping this dispatcher
// explicit is clearer than splitting it into indirection-heavy helpers.
// eslint-disable-next-line complexity
export function resolveCommand(
	cli: CliInstance,
	dependencies: Partial<ResolveCommandDependencies> = {},
): ResolvedCommand {
	const stderr = dependencies.stderr ?? process.stderr;
	const exit = dependencies.exit ?? process.exit;
	const parseUrlImpl = dependencies.parseUrl ?? parseUrl;
	const {
		output,
		verbose,
		resume,
		images,
		image: imageMulti,
		cookies: rawCookies,
		limit,
		format: rawFormat,
		text: rawText,
		content: rawContent,
		cookie: rawCookie,
		detail: rawDetail,
		topic: topicMulti,
		neutral: rawNeutral,
		unfollow: rawUnfollow,
		reply: rawReply,
		yes: rawYes,
		type: rawType,
		sort: rawSort,
		comments: rawComments,
		questions: rawQuestions,
		offset: rawOffset,
	} = cli.flags;
	const flags = {
		output,
		verbose,
		resume,
		images,
		cookies: rawCookies || undefined,
	};
	const format: 'human' | 'json' = rawFormat === 'json' ? 'json' : 'human';
	const text = rawText || undefined;
	const imageList: string[] | undefined =
		Array.isArray(imageMulti) && imageMulti.length > 0
			? imageMulti.filter(Boolean)
			: undefined;
	const content = rawContent ? String(rawContent) : undefined;
	const cookie = rawCookie ? String(rawCookie) : undefined;
	const detail = rawDetail ? String(rawDetail) : undefined;
	const topics: string[] | undefined =
		Array.isArray(topicMulti) && topicMulti.length > 0
			? topicMulti.filter(Boolean)
			: undefined;
	const neutral = Boolean(rawNeutral);
	const unfollow = Boolean(rawUnfollow);
	const reply = rawReply ? String(rawReply) : undefined;
	const yes = Boolean(rawYes);
	const searchType = rawType ? String(rawType) : undefined;
	const sortBy = rawSort ? String(rawSort) : undefined;
	const includeComments = Boolean(rawComments);
	const includeQuestions = Boolean(rawQuestions);
	const offset =
		typeof rawOffset === 'number' && rawOffset > 0 ? rawOffset : undefined;
	const {input} = cli;
	const [first, second, third] = input;

	if (!first) {
		return {command: 'ui-home', flags};
	}

	// Login (top-level Zhihu login). --cookie supports manual cookie import.
	if (first === 'login') {
		return {command: 'login', flags, cookie};
	}

	// --- X (Twitter) commands ---
	if (first === 'x') {
		if (!second) {
			exitWithError(
				'Error: x requires a subcommand (search, user, post, tweet, login, etc.)\n',
				stderr,
				exit,
			);
		}

		const xCommandMap: Record<string, ResolvedCommand['command']> = {
			search: 'x-search',
			user: 'x-user',
			timeline: 'x-timeline',
			followers: 'x-followers',
			following: 'x-following',
			mentions: 'x-mentions',
			bookmarks: 'x-bookmarks',
			metrics: 'x-metrics',
			tweet: 'x-tweet',
			post: 'x-post',
			reply: 'x-reply',
			quote: 'x-quote',
			delete: 'x-delete',
			like: 'x-like',
			retweet: 'x-retweet',
			login: 'x-login',
		};

		const cmd = xCommandMap[second];
		if (!cmd) {
			exitWithError(`Error: unknown x subcommand: ${second}\n`, stderr, exit);
		}

		// Commands that need no argument
		const xCommandsWithoutArguments = new Set([
			'mentions',
			'bookmarks',
			'login',
		]);
		if (!xCommandsWithoutArguments.has(second) && !third && second !== 'post') {
			exitWithError(`Error: x ${second} requires an argument\n`, stderr, exit);
		}

		return {
			command: cmd,
			url: third,
			flags,
			limit,
			format,
			text: text ?? (cmd === 'x-post' ? third : undefined),
			extraArgs: cli.input.slice(3),
		};
	}

	// --- Bilibili commands ---
	if (first === 'bili') {
		if (!second) {
			exitWithError(
				'Error: bili requires a subcommand (search, video, hot, login, etc.)\n',
				stderr,
				exit,
			);
		}

		const biliCommandMap: Record<string, ResolvedCommand['command']> = {
			search: 'bili-search',
			video: 'bili-video',
			user: 'bili-user',
			videos: 'bili-videos',
			hot: 'bili-hot',
			ranking: 'bili-ranking',
			related: 'bili-related',
			comments: 'bili-comments',
			like: 'bili-like',
			coin: 'bili-coin',
			triple: 'bili-triple',
			login: 'bili-login',
			whoami: 'bili-whoami',
			logout: 'bili-logout',
			download: 'bili-download',
		};

		const cmd = biliCommandMap[second];
		if (!cmd) {
			// Maybe it's a URL: bili https://bilibili.com/video/BVxxx
			const parsed = parseUrlImpl(second);
			if (parsed.platform === 'bili' && parsed.type === 'video') {
				return {command: 'bili-download', url: parsed.bvid, flags, format};
			}

			exitWithError(
				`Error: unknown bili subcommand: ${second}\n`,
				stderr,
				exit,
			);
		}

		const biliCommandsWithoutArguments = new Set([
			'hot',
			'ranking',
			'login',
			'whoami',
			'logout',
		]);
		if (!biliCommandsWithoutArguments.has(second) && !third) {
			exitWithError(
				`Error: bili ${second} requires an argument\n`,
				stderr,
				exit,
			);
		}

		return {
			command: cmd,
			url: third,
			flags,
			limit,
			format,
			text: text ?? undefined,
			extraArgs: cli.input.slice(3),
		};
	}

	// --- Weibo (微博) commands ---
	if (first === 'weibo') {
		if (!second) {
			exitWithError(
				'Error: weibo requires a subcommand (search, hot, read, login, etc.)\n',
				stderr,
				exit,
			);
		}

		const weiboCommandMap: Record<string, ResolvedCommand['command']> = {
			login: 'weibo-login',
			logout: 'weibo-logout',
			whoami: 'weibo-whoami',
			me: 'weibo-whoami',
			hot: 'weibo-hot',
			search: 'weibo-search',
			feed: 'weibo-feed',
			read: 'weibo-read',
			show: 'weibo-read',
			comments: 'weibo-comments',
			user: 'weibo-user',
			posts: 'weibo-posts',
			favorites: 'weibo-favorites',
			followers: 'weibo-followers',
			following: 'weibo-following',
			like: 'weibo-like',
			unlike: 'weibo-unlike',
			repost: 'weibo-repost',
			comment: 'weibo-comment',
			delete: 'weibo-delete',
			follow: 'weibo-follow',
			unfollow: 'weibo-unfollow',
			post: 'weibo-post',
			publish: 'weibo-post',
			download: 'weibo-download',
		};

		const cmd = weiboCommandMap[second];
		if (!cmd) {
			// Maybe it's a URL: weibo https://weibo.com/<uid>/<mid>
			const parsed = parseUrlImpl(second);
			if (parsed.platform === 'weibo' && parsed.type === 'status') {
				return {command: 'weibo-download', url: parsed.idstr, flags, format};
			}

			if (parsed.platform === 'weibo' && parsed.type === 'user') {
				return {
					command: 'weibo-user',
					url: parsed.uid ?? parsed.screenName ?? second,
					flags,
					format,
				};
			}

			exitWithError(
				`Error: unknown weibo subcommand: ${second}\n`,
				stderr,
				exit,
			);
		}

		const weiboCommandsWithoutArguments = new Set([
			'hot',
			'login',
			'whoami',
			'me',
			'logout',
			'favorites',
			'feed',
		]);
		if (!weiboCommandsWithoutArguments.has(second) && !third) {
			exitWithError(
				`Error: weibo ${second} requires an argument\n`,
				stderr,
				exit,
			);
		}

		if (cmd === 'weibo-post') {
			return {
				command: cmd,
				url: undefined,
				flags,
				limit,
				format,
				text: text ?? third,
				images: imageList,
				content,
				extraArgs: cli.input.slice(3),
			};
		}

		return {
			command: cmd,
			url: third,
			flags,
			limit,
			format,
			text: text ?? undefined,
			extraArgs: cli.input.slice(3),
		};
	}

	// --- AI Summary ---
	if (first === 'summary') {
		if (!second) {
			exitWithError('Error: summary requires a URL argument\n', stderr, exit);
		}

		return {command: 'summary', url: second, flags, format};
	}

	// --- XHS (Xiaohongshu) commands ---
	if (first === 'xhs') {
		if (!second) {
			exitWithError(
				'Error: xhs requires a subcommand (search, read, login, etc.)\n',
				stderr,
				exit,
			);
		}

		const xhsCommandMap: Record<string, ResolvedCommand['command']> = {
			search: 'xhs-search',
			read: 'xhs-read',
			feed: 'xhs-feed',
			topics: 'xhs-topics',
			user: 'xhs-user',
			posts: 'xhs-posts',
			followers: 'xhs-followers',
			following: 'xhs-following',
			like: 'xhs-like',
			unlike: 'xhs-unlike',
			favorite: 'xhs-favorite',
			unfavorite: 'xhs-unfavorite',
			comment: 'xhs-comment',
			delete: 'xhs-delete',
			post: 'xhs-post',
			login: 'xhs-login',
			whoami: 'xhs-whoami',
			favorites: 'xhs-favorites',
			logout: 'xhs-logout',
			download: 'xhs-download',
		};

		const cmd = xhsCommandMap[second];
		if (!cmd) {
			// Maybe it's a URL: xhs https://xiaohongshu.com/explore/xxx
			const parsed = parseUrlImpl(second);
			if (parsed.platform === 'xhs' && parsed.type === 'note') {
				return {command: 'xhs-download', url: parsed.noteId, flags, format};
			}

			exitWithError(`Error: unknown xhs subcommand: ${second}\n`, stderr, exit);
		}

		const xhsCommandsWithoutArguments = new Set([
			'feed',
			'login',
			'whoami',
			'favorites',
			'logout',
		]);
		if (!xhsCommandsWithoutArguments.has(second) && !third) {
			exitWithError(
				`Error: xhs ${second} requires an argument\n`,
				stderr,
				exit,
			);
		}

		if (cmd === 'xhs-post') {
			if (!imageList || imageList.length === 0) {
				exitWithError(
					'Error: xhs post requires at least one --image <path>\n',
					stderr,
					exit,
				);
			}

			return {
				command: cmd,
				url: third,
				flags,
				limit,
				format,
				text: text ?? undefined,
				images: imageList,
				content,
				extraArgs: cli.input.slice(3),
			};
		}

		return {
			command: cmd,
			url: third,
			flags,
			limit,
			format,
			text: text ?? undefined,
			extraArgs: cli.input.slice(3),
		};
	}

	// --- Zhihu subcommand family (zget zhihu <verb>) ---
	if (first === 'zhihu') {
		return resolveZhihuSubcommand(
			cli.input,
			{
				flags,
				format,
				limit,
				offset,
				text,
				content,
				images: imageList,
				cookie,
				detail,
				topics,
				neutral,
				unfollow,
				reply,
				yes,
			},
			stderr,
			exit,
		);
	}

	// Browse commands (no URL needed for hot/feed)
	if (browseCommands.has(first)) {
		const browseCommandsWithoutArguments = new Set(['hot', 'feed']);
		if (!browseCommandsWithoutArguments.has(first) && !second) {
			exitWithError(`Error: ${first} requires an argument\n`, stderr, exit);
		}

		const resolved: ResolvedCommand = {
			command: first as ResolvedCommand['command'],
			url: second,
			flags,
			limit,
		};
		if (format !== 'human') resolved.format = format;
		if (searchType) resolved.searchType = searchType;
		if (sortBy) resolved.sortBy = sortBy;
		if (includeComments) resolved.includeComments = includeComments;
		if (includeQuestions) resolved.includeQuestions = includeQuestions;
		if (offset !== undefined) resolved.offset = offset;
		return resolved;
	}

	// Download commands with explicit subcommand
	if (downloadCommands.has(first)) {
		if (!second) {
			exitWithError(`Error: ${first} requires a URL argument\n`, stderr, exit);
		}

		return {
			command: first as ResolvedCommand['command'],
			url: second,
			flags,
			limit,
		};
	}

	// Auto-detect from URL
	const parsed = parseUrlImpl(first);
	if (parsed.platform !== 'unknown') {
		switch (parsed.platform) {
			case 'zhihu': {
				const typeMap: Record<string, string> = {
					article: 'article',
					answer: 'answer',
					video: 'video',
					column: 'column',
					user: 'user',
				};
				return {
					command: (typeMap[parsed.type] ??
						'article') as ResolvedCommand['command'],
					url: first,
					flags,
					limit,
				};
			}

			case 'csdn': {
				return {command: 'csdn', url: first, flags, limit};
			}

			case 'weixin': {
				return {command: 'weixin', url: first, flags, limit};
			}

			case 'juejin': {
				return {command: 'juejin', url: first, flags, limit};
			}

			case 'x': {
				if (parsed.type === 'tweet') {
					return {command: 'x-tweet', url: first, flags, format};
				}

				if (parsed.type === 'user') {
					return {command: 'x-user', url: parsed.username, flags, format};
				}

				break;
			}

			case 'xhs': {
				if (parsed.type === 'note') {
					return {command: 'xhs-download', url: parsed.noteId, flags, format};
				}

				if (parsed.type === 'user') {
					return {command: 'xhs-user', url: parsed.userId, flags, format};
				}

				break;
			}

			case 'bili': {
				if (parsed.type === 'video') {
					return {command: 'bili-download', url: parsed.bvid, flags, format};
				}

				if (parsed.type === 'user') {
					return {command: 'bili-user', url: parsed.mid, flags, format};
				}

				break;
			}

			case 'weibo': {
				if (parsed.type === 'status') {
					return {
						command: 'weibo-download',
						url: parsed.idstr,
						flags,
						format,
					};
				}

				if (parsed.type === 'user') {
					return {
						command: 'weibo-user',
						url: parsed.uid ?? parsed.screenName ?? first,
						flags,
						format,
					};
				}

				break;
			}

			default: {
				break;
			}
		}
	}

	stderr.write(`Error: Could not detect content type from: ${first}\n`);
	stderr.write(
		'Supported: zhihu, csdn, weixin, juejin, x.com, xiaohongshu.com, bilibili.com, weibo.com URLs or use a subcommand\n',
	);
	return exit(1);
}

export function runCli({
	cli = createCli(),
	renderApp,
	dependencies,
	isInteractiveTerminal = () => Boolean(process.stdout.isTTY),
}: RunCliOptions = {}) {
	const resolved = resolveCommand(cli, dependencies);
	if (resolved.command === 'ui-home' && !isInteractiveTerminal()) {
		cli.showHelp(0);
		return undefined;
	}

	return (renderApp ?? render)(<App resolved={resolved} />) as unknown;
}

export function isDirectExecution(
	argv = process.argv,
	metaUrl = import.meta.url,
): boolean {
	const entryPoint = argv[1];
	return (
		entryPoint !== undefined &&
		pathToFileURL(resolvePath(entryPoint)).href === metaUrl
	);
}

if (isDirectExecution()) {
	runCli();
}
