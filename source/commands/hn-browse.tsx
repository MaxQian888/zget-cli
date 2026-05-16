import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {HnCookieStore} from '../core/auth/hn-auth';
import {HnApi} from '../core/api/hn-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {HnListKind} from '../types/hn';
import type {GlobalFlags} from './types';

export type HnBrowseType =
	| 'hn-top'
	| 'hn-best'
	| 'hn-new'
	| 'hn-ask'
	| 'hn-show'
	| 'hn-jobs'
	| 'hn-search'
	| 'hn-item'
	| 'hn-user'
	| 'hn-user-submitted'
	| 'hn-comments';

type Props = {
	readonly browseType: HnBrowseType;
	readonly query: string;
	readonly flags: GlobalFlags;
	readonly limit?: number;
	readonly format?: 'human' | 'json';
	readonly extraArgs?: string[];
};

function truncate(text: string, max = 100): string {
	const clean = (text ?? '')
		.replaceAll('\n', ' ')
		.replaceAll(/<[^>]+>/g, '')
		.trim();
	return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

function listKindFromBrowseType(t: HnBrowseType): HnListKind | undefined {
	switch (t) {
		case 'hn-top': {
			return 'top';
		}

		case 'hn-best': {
			return 'best';
		}

		case 'hn-new': {
			return 'new';
		}

		case 'hn-ask': {
			return 'ask';
		}

		case 'hn-show': {
			return 'show';
		}

		case 'hn-jobs': {
			return 'job';
		}

		default: {
			return undefined;
		}
	}
}

export default function HnBrowseCommand({
	browseType,
	query,
	flags,
	limit = 30,
	format = 'human',
	extraArgs = [],
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
				const cookieStore = new HnCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const api = new HnApi(cookieStore);
				const results: Array<{key: string; value: string}> = [];
				let payload: unknown;

				const listKind = listKindFromBrowseType(browseType);
				if (listKind) {
					const items = await api.getList(listKind, limit);
					payload = items;
					setTitle(`HN ${listKind}stories`);
					for (const [i, item] of items.entries()) {
						results.push({
							key: `${i + 1}`,
							value: `${item.title ?? '(no title)'}  · ${
								item.score ?? 0
							}pts  · ${item.by ?? '?'}  · ${
								item.descendants ?? 0
							} comments  · #${item.id}`,
						});
					}
				} else {
					switch (browseType) {
						case 'hn-search': {
							setTitle(`HN search: ${query}`);
							const sortByDate = extraArgs.includes('--date');
							const tags = extraArgs
								.find(a => a.startsWith('tags='))
								?.slice('tags='.length);
							const response = sortByDate
								? await api.searchByDate(query, {tags, hitsPerPage: limit})
								: await api.search(query, {tags, hitsPerPage: limit});
							payload = response;
							for (const [i, hit] of response.hits.entries()) {
								const text =
									hit.title ??
									truncate(hit.story_text ?? hit.comment_text ?? '');
								results.push({
									key: `${i + 1}`,
									value: `${text}  · ${hit.points ?? 0}pts  · ${
										hit.author ?? '?'
									}  · #${hit.objectID}`,
								});
							}

							break;
						}

						case 'hn-item': {
							if (!query) throw new Error('hn item 需要一个 ID 参数');
							const item = await api.getItem(query);
							payload = item;
							setTitle(`HN item #${item.id}`);
							if (item.title) results.push({key: 'title', value: item.title});
							if (item.by) results.push({key: 'by', value: item.by});
							if (typeof item.score === 'number') {
								results.push({key: 'score', value: String(item.score)});
							}

							if (typeof item.descendants === 'number') {
								results.push({
									key: 'comments',
									value: String(item.descendants),
								});
							}

							if (item.url) results.push({key: 'url', value: item.url});
							if (item.text) {
								results.push({key: 'text', value: truncate(item.text, 400)});
							}

							break;
						}

						case 'hn-user': {
							if (!query) throw new Error('hn user 需要一个用户名参数');
							const user = await api.getUser(query);
							payload = user;
							setTitle(`HN user ${user.id}`);
							results.push(
								{key: 'karma', value: String(user.karma)},
								{
									key: 'created',
									value: new Date(user.created * 1000).toISOString(),
								},
								{
									key: 'submitted',
									value: String(user.submitted?.length ?? 0),
								},
							);
							if (user.about) {
								results.push({key: 'about', value: truncate(user.about, 200)});
							}

							break;
						}

						case 'hn-user-submitted': {
							if (!query)
								throw new Error('hn user-submitted 需要一个用户名参数');
							const user = await api.getUser(query);
							const ids = (user.submitted ?? []).slice(0, limit);
							const items = await Promise.all(
								ids.map(async id => api.getItem(id)),
							);
							payload = items;
							setTitle(`HN submissions by ${user.id}`);
							for (const [i, item] of items.entries()) {
								results.push({
									key: `${i + 1}`,
									value: `${
										item.title ?? truncate(item.text ?? '(comment)', 80)
									}  · #${item.id}`,
								});
							}

							break;
						}

						case 'hn-comments': {
							if (!query) throw new Error('hn comments 需要一个 item ID 参数');
							const comments = await api.getComments(query, {
								maxDepth: 3,
								perLevel: limit,
							});
							payload = comments;
							setTitle(`HN comments on #${query}`);
							for (const [i, c] of comments.entries()) {
								results.push({
									key: `${i + 1}`,
									value: `[${c.by ?? '?'}] ${truncate(c.text ?? '', 100)}  · #${
										c.id
									}`,
								});
							}

							break;
						}

						default: {
							throw new Error(
								`Unsupported HN browse type: ${browseType as string}`,
							);
						}
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
				suggestion='请检查参数或运行 "zget hn login" 登录后重试'
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
