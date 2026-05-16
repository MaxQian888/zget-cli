import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {V2exTokenStore} from '../core/auth/v2ex-auth';
import {V2exApi} from '../core/api/v2ex-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {GlobalFlags} from './types';

export type V2exBrowseType =
	| 'v2ex-hot'
	| 'v2ex-latest'
	| 'v2ex-node'
	| 'v2ex-topics'
	| 'v2ex-topic'
	| 'v2ex-replies'
	| 'v2ex-member'
	| 'v2ex-notifications'
	| 'v2ex-my-topics'
	| 'v2ex-my-following';

type Props = {
	readonly browseType: V2exBrowseType;
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

export default function V2exBrowseCommand({
	browseType,
	query,
	flags: _flags,
	limit = 20,
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
				const store = new V2exTokenStore();
				await store.load();
				const api = new V2exApi(store);

				const results: Array<{key: string; value: string}> = [];
				let payload: unknown;

				switch (browseType) {
					case 'v2ex-hot': {
						setTitle('V2EX 热门主题');
						const all = await api.getHot();
						const items = all.slice(0, limit);
						payload = items;
						for (const [i, t] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${t.title}  · ${t.replies} replies  · ${
									t.member?.username ?? '?'
								}  · #${t.id}`,
							});
						}

						break;
					}

					case 'v2ex-latest': {
						setTitle('V2EX 最新主题');
						const all = await api.getLatest();
						const items = all.slice(0, limit);
						payload = items;
						for (const [i, t] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${t.title}  · ${t.replies} replies  · #${t.id}`,
							});
						}

						break;
					}

					case 'v2ex-node': {
						if (!query) throw new Error('v2ex node 需要一个节点名参数');
						setTitle(`V2EX 节点: ${query}`);
						const node = await api.getNode(query);
						payload = node;
						results.push(
							{key: 'name', value: node.name},
							{key: 'title', value: node.title},
							{key: 'topics', value: String(node.topics ?? 0)},
							{key: 'header', value: truncate(node.header ?? '', 200)},
						);
						break;
					}

					case 'v2ex-topics': {
						if (!query) throw new Error('v2ex topics 需要一个节点名参数');
						setTitle(`V2EX 节点 ${query} 的主题`);
						const all = await api.getNodeTopics(query);
						const items = all.slice(0, limit);
						payload = items;
						for (const [i, t] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${t.title}  · ${t.replies} replies  · #${t.id}`,
							});
						}

						break;
					}

					case 'v2ex-topic': {
						if (!query) throw new Error('v2ex topic 需要一个 ID 参数');
						setTitle(`V2EX 主题 #${query}`);
						const topic = await api.getTopic(query);
						payload = topic;
						results.push(
							{key: 'title', value: topic.title},
							{key: 'author', value: topic.member?.username ?? '?'},
							{key: 'node', value: topic.node?.title ?? '?'},
							{key: 'replies', value: String(topic.replies)},
							{key: 'content', value: truncate(topic.content ?? '', 400)},
						);
						break;
					}

					case 'v2ex-replies': {
						if (!query) throw new Error('v2ex replies 需要一个主题 ID 参数');
						setTitle(`V2EX 主题 #${query} 的回复`);
						const all = await api.getReplies(query);
						const items = all.slice(0, limit);
						payload = items;
						for (const [i, r] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `[${r.member?.username ?? '?'}] ${truncate(
									r.content ?? '',
									100,
								)}  · #${r.id}`,
							});
						}

						break;
					}

					case 'v2ex-member': {
						if (!query) throw new Error('v2ex member 需要一个用户名参数');
						setTitle(`V2EX 用户 ${query}`);
						const member = await api.getMember(query);
						payload = member;
						results.push(
							{key: 'username', value: member.username},
							{key: 'id', value: String(member.id)},
							{key: 'tagline', value: member.tagline ?? '-'},
							{key: 'location', value: member.location ?? '-'},
						);
						break;
					}

					case 'v2ex-notifications': {
						setTitle('V2EX 通知');
						const all = await api.getNotifications();
						const items = all.slice(0, limit);
						payload = items;
						for (const [i, n] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(n.text ?? '', 120)}  · #${n.id}`,
							});
						}

						break;
					}

					case 'v2ex-my-topics': {
						setTitle('V2EX 我的主题');
						const all = await api.getMyTopics();
						const items = all.slice(0, limit);
						payload = items;
						for (const [i, t] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${t.title}  · ${t.replies} replies  · #${t.id}`,
							});
						}

						break;
					}

					case 'v2ex-my-following': {
						setTitle('V2EX 我关注的主题');
						const all = await api.getMyFollowing();
						const items = all.slice(0, limit);
						payload = items;
						for (const [i, t] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${t.title}  · ${t.replies} replies  · #${t.id}`,
							});
						}

						break;
					}

					default: {
						throw new Error(
							`Unsupported V2EX browse type: ${browseType as string}`,
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
				suggestion='请检查参数或运行 "zget v2ex login --cookie <token>" 登录后重试'
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
