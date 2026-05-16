import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {RedditCredentialStore} from '../core/auth/reddit-auth';
import {RedditApi} from '../core/api/reddit-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {GlobalFlags} from './types';

export type RedditBrowseType =
	| 'reddit-search'
	| 'reddit-subreddit'
	| 'reddit-hot'
	| 'reddit-top'
	| 'reddit-new'
	| 'reddit-read'
	| 'reddit-comments'
	| 'reddit-user'
	| 'reddit-user-posts'
	| 'reddit-user-comments'
	| 'reddit-saved'
	| 'reddit-subscribed';

type Props = {
	readonly browseType: RedditBrowseType;
	readonly query: string;
	readonly flags: GlobalFlags;
	readonly limit?: number;
	readonly format?: 'human' | 'json';
};

function truncate(text: string, max = 100): string {
	const clean = (text ?? '')
		.replaceAll('\n', ' ')
		.replaceAll(/<[^>]+>/g, '')
		.trim();
	return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

export default function RedditBrowseCommand({
	browseType,
	query,
	flags: _flags,
	limit = 25,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [lines, setLines] = useState<Array<{key: string; value: string}>>([]);
	const [title, setTitle] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		// eslint-disable-next-line complexity
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const credStore = new RedditCredentialStore();
				await credStore.load();
				const api = new RedditApi(credStore);

				const results: Array<{key: string; value: string}> = [];
				let payload: unknown;

				switch (browseType) {
					case 'reddit-hot':
					case 'reddit-top':
					case 'reddit-new': {
						const sort = browseType.replace('reddit-', '') as
							| 'hot'
							| 'top'
							| 'new';
						setTitle(query ? `Reddit r/${query} (${sort})` : `Reddit /${sort}`);
						const items = await (sort === 'hot'
							? api.getHot(query || undefined, limit)
							: sort === 'top'
							? api.getTop(query || undefined, limit)
							: api.getNew(query || undefined, limit));
						payload = items;
						for (const [i, p] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${p.title}  · ${p.score}pts  · u/${p.author}  · r/${p.subreddit}  · #${p.id}`,
							});
						}

						break;
					}

					case 'reddit-search': {
						if (!query) throw new Error('reddit search 需要 query 参数');
						setTitle(`Reddit search: ${query}`);
						const items = await api.search(query, {limit});
						payload = items;
						for (const [i, p] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${p.title}  · ${p.score}pts  · r/${p.subreddit}  · #${p.id}`,
							});
						}

						break;
					}

					case 'reddit-subreddit': {
						if (!query) throw new Error('reddit subreddit 需要 subreddit 名称');
						setTitle(`Reddit r/${query}`);
						const sub = await api.getSubreddit(query);
						payload = sub;
						results.push(
							{key: 'name', value: sub.display_name},
							{key: 'title', value: sub.title ?? '-'},
							{
								key: 'subscribers',
								value: String(sub.subscribers ?? 0),
							},
							{
								key: 'description',
								value: truncate(sub.public_description ?? '', 200),
							},
						);
						break;
					}

					case 'reddit-read': {
						if (!query) throw new Error('reddit read 需要 post ID');
						setTitle(`Reddit post #${query}`);
						const post = await api.getPost(query);
						payload = post;
						results.push(
							{key: 'title', value: post.title},
							{key: 'author', value: `u/${post.author}`},
							{key: 'subreddit', value: `r/${post.subreddit}`},
							{key: 'score', value: String(post.score)},
							{key: 'comments', value: String(post.num_comments)},
							{key: 'text', value: truncate(post.selftext ?? '', 400)},
						);
						if (post.url) results.push({key: 'url', value: post.url});
						break;
					}

					case 'reddit-comments': {
						if (!query) throw new Error('reddit comments 需要 post ID');
						setTitle(`Reddit comments on #${query}`);
						const comments = await api.getComments(query, {limit});
						payload = comments;
						for (const [i, c] of comments.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `[u/${c.author}] ${truncate(c.body ?? '', 100)}  · #${
									c.id
								}`,
							});
						}

						break;
					}

					case 'reddit-user': {
						if (!query) throw new Error('reddit user 需要用户名');
						setTitle(`Reddit u/${query}`);
						const user = await api.getUser(query);
						payload = user;
						results.push(
							{key: 'name', value: user.name},
							{key: 'karma', value: String(user.total_karma ?? 0)},
							{key: 'link', value: String(user.link_karma ?? 0)},
							{key: 'comment', value: String(user.comment_karma ?? 0)},
						);
						break;
					}

					case 'reddit-user-posts': {
						if (!query) throw new Error('reddit user-posts 需要用户名');
						setTitle(`u/${query} 的帖子`);
						const items = await api.getUserPosts(query, limit);
						payload = items;
						for (const [i, p] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${p.title}  · ${p.score}pts  · r/${p.subreddit}  · #${p.id}`,
							});
						}

						break;
					}

					case 'reddit-user-comments': {
						if (!query) throw new Error('reddit user-comments 需要用户名');
						setTitle(`u/${query} 的评论`);
						const items = await api.getUserComments(query, limit);
						payload = items;
						for (const [i, c] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(c.body ?? '', 100)}  · #${c.id}`,
							});
						}

						break;
					}

					case 'reddit-saved': {
						setTitle('Reddit 已保存');
						const items = await api.getSaved(limit);
						payload = items;
						for (const [i, item] of items.entries()) {
							const title_ =
								'title' in item ? item.title : truncate(item.body ?? '', 80);
							results.push({
								key: `${i + 1}`,
								value: `${title_}  · #${item.id}`,
							});
						}

						break;
					}

					case 'reddit-subscribed': {
						setTitle('Reddit 订阅的 subreddit');
						const items = await api.getSubscribed(limit);
						payload = items;
						for (const [i, s] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `r/${s.display_name}  · ${
									s.subscribers ?? 0
								} subscribers`,
							});
						}

						break;
					}

					default: {
						throw new Error(
							`Unsupported Reddit browse type: ${browseType as string}`,
						);
					}
				}

				if (format === 'json') {
					setJsonOutput(JSON.stringify({ok: true, data: payload}, null, 2));
				} else {
					setLines(results);
				}
			} catch (error_: unknown) {
				const message =
					error_ instanceof Error ? error_.message : String(error_);
				pendingExitCode = getExitCode(error_);
				const hint = getErrorHint(error_);
				setError(message);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: false,
								error: {code: pendingExitCode, message, hint},
							},
							null,
							2,
						),
					);
				}
			} finally {
				setLoading(false);
				setTimeout(() => {
					exit(pendingExitCode);
				}, 200);
			}
		};

		void run();
	});

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion='请检查参数或运行 "zget reddit login" 登录后重试'
			/>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> 正在加载...</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{title && (
				<Text bold color="cyan">
					{title}
				</Text>
			)}
			<Text> </Text>
			{lines.map(line => (
				<Box key={line.key + line.value}>
					<Text bold color="cyan">{`  ${line.key.padStart(8)}  `}</Text>
					<Text>{line.value}</Text>
				</Box>
			))}
			{lines.length === 0 && <Text dimColor> 无结果</Text>}
		</Box>
	);
}
