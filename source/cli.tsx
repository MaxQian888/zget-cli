import process from 'node:process';
import meow from 'meow';
import {render} from 'ink';
import App from './app';
import {buildCliHelpText, cliFlags} from './cli-metadata';
import {parseUrl} from './core/utils/url-parser';
import type {ResolvedCommand} from './commands/types';

const cli = meow(buildCliHelpText(), {
	importMeta: import.meta,
	flags: {
		output: {
			type: cliFlags.output.type,
			shortFlag: 'o',
			default: cliFlags.output.default,
		},
		verbose: {
			type: cliFlags.verbose.type,
			shortFlag: 'v',
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
		cookies: {
			type: cliFlags.cookies.type,
			default: cliFlags.cookies.default,
		},
		limit: {
			type: 'number' as const,
			shortFlag: 'l',
			default: cliFlags.limit.default,
		},
		format: {
			type: 'string' as const,
			shortFlag: 'f',
			default: cliFlags.format.default,
		},
		text: {
			type: 'string' as const,
			shortFlag: 't',
			default: cliFlags.text.default,
		},
		content: {
			type: 'string' as const,
			default: cliFlags.content.default,
		},
	},
});

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

function resolveCommand(): ResolvedCommand {
	const {
		output,
		verbose,
		resume,
		images,
		cookies: rawCookies,
		limit,
		format: rawFormat,
		text: rawText,
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
	const {input} = cli;
	const [first, second, third] = input;

	if (!first) {
		cli.showHelp(0);
		return {command: 'help', flags};
	}

	// Login
	if (first === 'login') {
		return {command: 'login', flags};
	}

	// --- X (Twitter) commands ---
	if (first === 'x') {
		if (!second) {
			process.stderr.write(
				'Error: x requires a subcommand (search, user, post, tweet, login, etc.)\n',
			);
			process.exit(1);
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
			process.stderr.write(`Error: unknown x subcommand: ${second}\n`);
			process.exit(1);
		}

		// Commands that need no argument
		const xCommandsWithoutArguments = new Set([
			'mentions',
			'bookmarks',
			'login',
		]);
		if (!xCommandsWithoutArguments.has(second) && !third && second !== 'post') {
			process.stderr.write(`Error: x ${second} requires an argument\n`);
			process.exit(1);
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
			process.stderr.write(
				'Error: bili requires a subcommand (search, video, hot, login, etc.)\n',
			);
			process.exit(1);
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
			const parsed = parseUrl(second);
			if (parsed.platform === 'bili' && parsed.type === 'video') {
				return {command: 'bili-download', url: parsed.bvid, flags, format};
			}

			process.stderr.write(`Error: unknown bili subcommand: ${second}\n`);
			process.exit(1);
		}

		const biliCommandsWithoutArguments = new Set([
			'hot',
			'ranking',
			'login',
			'whoami',
			'logout',
		]);
		if (!biliCommandsWithoutArguments.has(second) && !third) {
			process.stderr.write(`Error: bili ${second} requires an argument\n`);
			process.exit(1);
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
			process.stderr.write('Error: summary requires a URL argument\n');
			process.exit(1);
		}

		return {command: 'summary', url: second, flags, format};
	}

	// --- XHS (Xiaohongshu) commands ---
	if (first === 'xhs') {
		if (!second) {
			process.stderr.write(
				'Error: xhs requires a subcommand (search, read, login, etc.)\n',
			);
			process.exit(1);
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
			const parsed = parseUrl(second);
			if (parsed.platform === 'xhs' && parsed.type === 'note') {
				return {command: 'xhs-download', url: parsed.noteId, flags, format};
			}

			process.stderr.write(`Error: unknown xhs subcommand: ${second}\n`);
			process.exit(1);
		}

		const xhsCommandsWithoutArguments = new Set([
			'feed',
			'login',
			'whoami',
			'favorites',
			'logout',
		]);
		if (!xhsCommandsWithoutArguments.has(second) && !third) {
			process.stderr.write(`Error: xhs ${second} requires an argument\n`);
			process.exit(1);
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

	// Browse commands (no URL needed for hot/feed)
	if (browseCommands.has(first)) {
		const browseCommandsWithoutArguments = new Set(['hot', 'feed']);
		if (!browseCommandsWithoutArguments.has(first) && !second) {
			process.stderr.write(`Error: ${first} requires an argument\n`);
			process.exit(1);
		}

		return {
			command: first as ResolvedCommand['command'],
			url: second,
			flags,
			limit,
		};
	}

	// Download commands with explicit subcommand
	if (downloadCommands.has(first)) {
		if (!second) {
			process.stderr.write(`Error: ${first} requires a URL argument\n`);
			process.exit(1);
		}

		return {
			command: first as ResolvedCommand['command'],
			url: second,
			flags,
			limit,
		};
	}

	// Auto-detect from URL
	const parsed = parseUrl(first);
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

			default: {
				break;
			}
		}
	}

	process.stderr.write(`Error: Could not detect content type from: ${first}\n`);
	process.stderr.write(
		'Supported: zhihu, csdn, weixin, juejin, x.com, xiaohongshu.com, bilibili.com URLs or use a subcommand\n',
	);
	process.exit(1);
}

const resolved = resolveCommand();
render(<App resolved={resolved} />);
