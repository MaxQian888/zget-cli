import {Box, Text} from 'ink';
import {useState, useEffect} from 'react';
import {Spinner} from '@inkjs/ui';
import {XCredentialStore} from '../core/auth/x-auth';
import {XApi} from '../core/api/x-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type TwitterBrowseType =
	| 'x-search'
	| 'x-user'
	| 'x-timeline'
	| 'x-followers'
	| 'x-following'
	| 'x-mentions'
	| 'x-bookmarks'
	| 'x-metrics';

type Props = {
	readonly browseType: TwitterBrowseType;
	readonly query: string;
	readonly flags: GlobalFlags;
	readonly limit?: number;
	readonly format?: 'human' | 'json';
};

function formatCount(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
	return String(n);
}

function truncate(text: string, max = 60): string {
	const clean = text.replaceAll('\n', ' ').trim();
	return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

export default function TwitterBrowseCommand({
	browseType,
	query,
	flags: _flags,
	limit = 10,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [lines, setLines] = useState<Array<{key: string; value: string}>>([]);
	const [title, setTitle] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useEffect(() => {
		const run = async () => {
			try {
				const credStore = new XCredentialStore();
				await credStore.load();
				const api = new XApi(credStore);
				const results: Array<{key: string; value: string}> = [];

				switch (browseType) {
					case 'x-search': {
						setTitle(`X 搜索: ${query}`);
						const resp = await api.searchRecent(query, limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(resp, null, 2));
							break;
						}

						const users = resp.includes?.users ?? [];
						for (const [i, tweet] of (resp.data ?? []).entries()) {
							const author = users.find(u => u.id === tweet.author_id);
							const name = author ? `@${author.username}` : '';
							results.push({
								key: `${i + 1}`,
								value: `${name}  ${truncate(tweet.text, 50)}  ❤️${formatCount(
									tweet.public_metrics?.like_count ?? 0,
								)}`,
							});
						}

						break;
					}

					case 'x-user': {
						setTitle(`X 用户: @${query}`);
						const resp = await api.getUserByUsername(api.stripAt(query));
						if (format === 'json') {
							setJsonOutput(JSON.stringify(resp, null, 2));
							break;
						}

						const u = resp.data;
						results.push(
							{key: '名称', value: `${u.name} (@${u.username})`},
							{key: '简介', value: truncate(u.description ?? '-', 100)},
							{
								key: '推文',
								value: formatCount(u.public_metrics?.tweet_count ?? 0),
							},
							{
								key: '关注',
								value: formatCount(u.public_metrics?.following_count ?? 0),
							},
							{
								key: '粉丝',
								value: formatCount(u.public_metrics?.followers_count ?? 0),
							},
						);
						if (u.location) results.push({key: '位置', value: u.location});
						break;
					}

					case 'x-timeline': {
						setTitle(`@${query} 的推文`);
						const userId = await api.resolveUserId(api.stripAt(query));
						const resp = await api.getUserTimeline(userId, limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(resp, null, 2));
							break;
						}

						for (const [i, tweet] of (resp.data ?? []).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(tweet.text, 60)}  ❤️${formatCount(
									tweet.public_metrics?.like_count ?? 0,
								)}`,
							});
						}

						break;
					}

					case 'x-followers': {
						setTitle(`@${query} 的粉丝`);
						const userId = await api.resolveUserId(api.stripAt(query));
						const resp = await api.getUserFollowers(userId, limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(resp, null, 2));
							break;
						}

						for (const [i, user] of (resp.data ?? []).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${user.name} (@${user.username})  粉丝: ${formatCount(
									user.public_metrics?.followers_count ?? 0,
								)}`,
							});
						}

						break;
					}

					case 'x-following': {
						setTitle(`@${query} 的关注`);
						const userId = await api.resolveUserId(api.stripAt(query));
						const resp = await api.getUserFollowing(userId, limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(resp, null, 2));
							break;
						}

						for (const [i, user] of (resp.data ?? []).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${user.name} (@${user.username})  粉丝: ${formatCount(
									user.public_metrics?.followers_count ?? 0,
								)}`,
							});
						}

						break;
					}

					case 'x-mentions': {
						setTitle('我的提及');
						const resp = await api.getMyMentions(limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(resp, null, 2));
							break;
						}

						const users = resp.includes?.users ?? [];
						for (const [i, tweet] of (resp.data ?? []).entries()) {
							const author = users.find(u => u.id === tweet.author_id);
							results.push({
								key: `${i + 1}`,
								value: `${author ? `@${author.username}` : ''}  ${truncate(
									tweet.text,
									50,
								)}`,
							});
						}

						break;
					}

					case 'x-bookmarks': {
						setTitle('我的书签');
						const resp = await api.getMyBookmarks(limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(resp, null, 2));
							break;
						}

						for (const [i, tweet] of (resp.data ?? []).entries()) {
							results.push({
								key: `${i + 1}`,
								value: truncate(tweet.text, 60),
							});
						}

						break;
					}

					case 'x-metrics': {
						setTitle(`推文指标: ${query}`);
						const tweetId = api.parseTweetId(query);
						const resp = await api.getTweetMetrics(tweetId);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(resp, null, 2));
							break;
						}

						const m = resp.data.public_metrics;
						if (m) {
							results.push(
								{key: '点赞', value: formatCount(m.like_count)},
								{key: '转推', value: formatCount(m.retweet_count)},
								{key: '回复', value: formatCount(m.reply_count)},
								{key: '引用', value: formatCount(m.quote_count)},
							);
							if (m.bookmark_count !== undefined) {
								results.push({
									key: '书签',
									value: formatCount(m.bookmark_count),
								});
							}

							if (m.impression_count !== undefined) {
								results.push({
									key: '浏览',
									value: formatCount(m.impression_count),
								});
							}
						}

						break;
					}

					default: {
						throw new Error('Unsupported X browse type');
					}
				}

				setLines(results);
				setLoading(false);
			} catch (error_: unknown) {
				setError(error_ instanceof Error ? error_.message : String(error_));
				setLoading(false);
			} finally {
				setTimeout(() => {
					exit();
				}, 100);
			}
		};

		void run();
	}, []);

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion='请检查 X API 凭证是否正确配置，运行 "zget x login" 设置'
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
