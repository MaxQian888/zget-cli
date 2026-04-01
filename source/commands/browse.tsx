import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {ApiClient} from '../core/api/client';
import {ZhihuApi} from '../core/api/zhihu-api';
import {CookieStore} from '../core/auth/cookie-store';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type BrowseType =
	| 'search'
	| 'hot'
	| 'question'
	| 'answers'
	| 'answer'
	| 'feed'
	| 'topic'
	| 'user-info'
	| 'user-answers'
	| 'user-articles';

type Props = {
	readonly browseType: BrowseType;
	readonly query: string;
	readonly flags: GlobalFlags;
	readonly limit?: number;
};

function stripHtml(text: string): string {
	return text
		.replace(/<[^>]*>/g, '')
		.replace(/&[^;]+;/g, ' ')
		.trim();
}

function truncate(text: string, max = 60): string {
	const clean = text.replaceAll('\n', ' ').trim();
	return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

function formatCount(n: number): string {
	if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
	if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
	return String(n);
}

export default function BrowseCommand({
	browseType,
	query,
	flags,
	limit = 10,
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [lines, setLines] = useState<Array<{key: string; value: string}>>([]);
	const [title, setTitle] = useState('');

	useRunOnceEffect(() => {
		// Each browse mode maps a different API payload into terminal rows.
		// eslint-disable-next-line complexity
		const run = async () => {
			try {
				const cookieStore = new CookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const client = new ApiClient({cookieStore});
				const api = new ZhihuApi(client);
				const results: Array<{key: string; value: string}> = [];

				switch (browseType) {
					case 'search': {
						setTitle(`搜索: ${query}`);
						const {items} = await api.search(query, 'general', 0, limit);
						for (const [i, item] of items.entries()) {
							const hl = item.highlight as Record<string, string> | undefined;
							const t = String(hl?.title ?? item.title ?? item.name ?? '');
							const excerpt = String(hl?.description ?? item.excerpt ?? '');
							results.push({
								key: `${i + 1}`,
								value: `${stripHtml(t)}  ${truncate(stripHtml(excerpt), 40)}`,
							});
						}

						break;
					}

					case 'hot': {
						setTitle('知乎热榜');
						const items = await api.getHotList(limit);
						for (const [i, item] of items.entries()) {
							const target = item.target as Record<string, unknown> | undefined;
							const t = String(target?.title ?? item.title ?? '');
							const heat = target?.excerpt ?? '';
							results.push({
								key: `${i + 1}`,
								value: `${t}  ${truncate(String(heat), 30)}`,
							});
						}

						break;
					}

					case 'question': {
						setTitle('问题详情');
						const q = await api.getQuestion(query);
						results.push(
							{key: '标题', value: String(q.title ?? '')},
							{
								key: '详情',
								value: truncate(stripHtml(String(q.detail ?? '')), 200),
							},
							{key: '回答', value: formatCount(Number(q.answer_count ?? 0))},
							{key: '关注', value: formatCount(Number(q.follower_count ?? 0))},
							{key: '浏览', value: formatCount(Number(q.visit_count ?? 0))},
						);
						break;
					}

					case 'answers': {
						setTitle(`问题 ${query} 的回答`);
						const {items} = await api.getQuestionAnswers(query, 0, limit);
						for (const [i, item] of items.entries()) {
							const author =
								(item.author as Record<string, unknown>)?.name ?? 'Anon';
							const excerpt = truncate(
								stripHtml(String(item.content ?? '')),
								50,
							);
							const votes = formatCount(Number(item.voteup_count ?? 0));
							results.push({
								key: `${i + 1}`,
								value: `${String(author)}  ${excerpt}  ▲${votes}`,
							});
						}

						break;
					}

					case 'answer': {
						setTitle('回答详情');
						const a = await api.getAnswer(query);
						const author =
							(a.author as Record<string, unknown>)?.name ?? 'Unknown';
						const question =
							(a.question as Record<string, unknown>)?.title ?? '';
						results.push(
							{key: '问题', value: String(question)},
							{key: '作者', value: String(author)},
							{
								key: '内容',
								value: truncate(stripHtml(String(a.content ?? '')), 300),
							},
							{key: '赞同', value: formatCount(Number(a.voteup_count ?? 0))},
							{key: '评论', value: formatCount(Number(a.comment_count ?? 0))},
						);
						break;
					}

					case 'feed': {
						setTitle('推荐');
						const items = await api.getFeed(limit);
						for (const [i, item] of items.entries()) {
							const target = item.target as Record<string, unknown> | undefined;
							const t = String(target?.title ?? item.title ?? '');
							const type = String(item.type ?? '');
							results.push({
								key: `${i + 1}`,
								value: `[${type}] ${t}`,
							});
						}

						break;
					}

					case 'topic': {
						setTitle('话题详情');
						const t = await api.getTopic(query);
						results.push(
							{key: '名称', value: String(t.name ?? '')},
							{
								key: '介绍',
								value: truncate(stripHtml(String(t.introduction ?? '')), 200),
							},
							{key: '关注', value: formatCount(Number(t.followers_count ?? 0))},
						);
						break;
					}

					case 'user-info': {
						setTitle('用户信息');
						const u = await api.getUserProfile(query);
						results.push(
							{key: '名称', value: u.name},
							{key: '简介', value: u.headline || '-'},
							{key: '回答', value: formatCount(u.answerCount)},
							{key: '文章', value: formatCount(u.articlesCount)},
							{key: '关注者', value: formatCount(u.followerCount)},
						);
						break;
					}

					case 'user-answers': {
						setTitle(`${query} 的回答`);
						const {items} = await api.getUserAnswers(query, 0, limit);
						for (const [i, item] of items.entries()) {
							const qTitle = item.question?.title ?? '';
							results.push({key: `${i + 1}`, value: String(qTitle)});
						}

						break;
					}

					case 'user-articles': {
						setTitle(`${query} 的文章`);
						const {items} = await api.getUserArticles(query, 0, limit);
						for (const [i, item] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: item.title ?? String(item.id),
							});
						}

						break;
					}

					default: {
						throw new Error('Unsupported browse type');
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
	});

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion="请检查参数或运行 zget login 登录后重试"
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
