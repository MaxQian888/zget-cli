import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {WeiboCookieStore} from '../core/auth/weibo-auth';
import {WeiboApi} from '../core/api/weibo-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {WeiboFeedKind} from '../types/weibo';
import type {GlobalFlags} from './types';

type WeiboBrowseType =
	| 'weibo-hot'
	| 'weibo-search'
	| 'weibo-feed'
	| 'weibo-read'
	| 'weibo-comments'
	| 'weibo-user'
	| 'weibo-posts'
	| 'weibo-favorites'
	| 'weibo-followers'
	| 'weibo-following';

type Props = {
	readonly browseType: WeiboBrowseType;
	readonly query: string;
	readonly flags: GlobalFlags;
	readonly limit?: number;
	readonly format?: 'human' | 'json';
	readonly extraArgs?: string[];
};

function truncate(text: string, max = 80): string {
	const clean = (text ?? '')
		.replaceAll('\n', ' ')
		.replaceAll(/<[^>]+>/g, '')
		.trim();
	return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

function formatCount(n?: number): string {
	const value = n ?? 0;
	if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}亿`;
	if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
	return String(value);
}

export default function WeiboBrowseCommand({
	browseType,
	query,
	flags,
	limit = 10,
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
				const cookieStore = new WeiboCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const api = new WeiboApi(cookieStore);
				const results: Array<{key: string; value: string}> = [];
				let payload: unknown;

				switch (browseType) {
					case 'weibo-hot': {
						setTitle('微博热搜');
						const items = await api.getHot();
						payload = items.slice(0, limit);
						for (const [i, item] of items.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${item.word}  🔥${formatCount(item.hot_value)}  ${
									item.label || item.category || ''
								}`,
							});
						}

						break;
					}

					case 'weibo-search': {
						setTitle(`微博搜索: ${query}`);
						const items = await api.search(query, limit);
						payload = items;
						for (const [i, item] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `@${item.user_screen_name ?? '?'}: ${truncate(
									item.text,
									80,
								)}`,
							});
						}

						break;
					}

					case 'weibo-feed': {
						const kind = (extraArgs[0] ?? 'for-you') as WeiboFeedKind;
						setTitle(`微博 Timeline (${kind})`);
						const items = await api.getFeed(kind, limit);
						payload = items;
						for (const [i, status] of items.entries()) {
							const author = status.user?.screen_name ?? '?';
							const text = status.text_raw ?? truncate(status.text ?? '', 80);
							results.push({
								key: `${i + 1}`,
								value: `@${author}: ${truncate(text, 80)}`,
							});
						}

						break;
					}

					case 'weibo-read': {
						setTitle(`微博详情: ${query}`);
						const status = await api.getStatus(query);
						payload = status;
						const author = status.user?.screen_name ?? '?';
						const text = status.text_raw ?? truncate(status.text ?? '', 200);
						results.push(
							{key: '作者', value: author},
							{key: 'UID', value: status.user?.idstr ?? '-'},
							{key: 'mid', value: status.mid},
							{key: '发布', value: status.created_at},
							{key: '点赞', value: formatCount(status.attitudes_count)},
							{key: '评论', value: formatCount(status.comments_count)},
							{key: '转发', value: formatCount(status.reposts_count)},
							{key: '正文', value: truncate(text, 240)},
						);
						break;
					}

					case 'weibo-comments': {
						setTitle(`微博评论: ${query}`);
						const comments = await api.getComments(query, limit);
						payload = comments;
						for (const [i, c] of comments.entries()) {
							const author = c.user?.screen_name ?? '?';
							results.push({
								key: `${i + 1}`,
								value: `${author}: ${truncate(
									c.text_raw ?? c.text,
									80,
								)}  👍${formatCount(c.like_counts)}`,
							});
						}

						break;
					}

					case 'weibo-user': {
						setTitle(`微博用户: ${query}`);
						const isUid = /^\d+$/.test(query);
						const user = await api.getUser(
							isUid ? {uid: query} : {screenName: query},
						);
						payload = user;
						results.push(
							{key: '昵称', value: user.screen_name ?? '-'},
							{key: 'UID', value: user.idstr ?? String(user.id)},
							{key: '简介', value: truncate(user.description ?? '-', 120)},
							{key: '位置', value: user.location ?? '-'},
							{key: '粉丝', value: formatCount(user.followers_count)},
							{key: '关注', value: formatCount(user.friends_count)},
							{key: '微博', value: formatCount(user.statuses_count)},
							{
								key: '认证',
								value: user.verified
									? user.verified_reason ?? '已认证'
									: '未认证',
							},
						);
						break;
					}

					case 'weibo-posts': {
						setTitle(`用户 ${query} 的微博`);
						const posts = await api.getUserPosts(query, 1);
						payload = posts.slice(0, limit);
						for (const [i, p] of posts.slice(0, limit).entries()) {
							const text = p.text_raw ?? truncate(p.text ?? '', 80);
							results.push({
								key: `${i + 1}`,
								value: `${p.created_at}  ${truncate(text, 80)}`,
							});
						}

						break;
					}

					case 'weibo-favorites': {
						setTitle('我的收藏');
						const favs = await api.getFavorites(1);
						payload = favs.slice(0, limit);
						for (const [i, p] of favs.slice(0, limit).entries()) {
							const author = p.user?.screen_name ?? '?';
							const text = p.text_raw ?? truncate(p.text ?? '', 80);
							results.push({
								key: `${i + 1}`,
								value: `@${author}: ${truncate(text, 80)}`,
							});
						}

						break;
					}

					case 'weibo-followers': {
						setTitle(`用户 ${query} 的粉丝`);
						const fans = await api.getFollowers(query, 1);
						payload = fans.slice(0, limit);
						for (const [i, u] of fans.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `@${u.screen_name}  粉丝${formatCount(
									u.followers_count,
								)}`,
							});
						}

						break;
					}

					case 'weibo-following': {
						setTitle(`用户 ${query} 关注的人`);
						const following = await api.getFollowing(query, 1);
						payload = following.slice(0, limit);
						for (const [i, u] of following.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `@${u.screen_name}  粉丝${formatCount(
									u.followers_count,
								)}`,
							});
						}

						break;
					}

					default: {
						throw new Error('Unsupported Weibo browse type');
					}
				}

				if (format === 'json') {
					setJsonOutput(JSON.stringify({ok: true, data: payload}, null, 2));
				}

				setLines(results);
				setLoading(false);
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

				setLoading(false);
			} finally {
				setTimeout(() => {
					exit(pendingExitCode);
				}, 100);
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
				suggestion='请检查参数或运行 "zget weibo login" 登录后重试'
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
					<Text bold color="cyan">{`  ${line.key.padStart(6)}  `}</Text>
					<Text>{line.value}</Text>
				</Box>
			))}
			{lines.length === 0 && <Text dimColor> 无结果</Text>}
		</Box>
	);
}
