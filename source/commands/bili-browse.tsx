import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {BiliCookieStore} from '../core/auth/bili-auth';
import {BiliApi} from '../core/api/bili-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type BiliBrowseType =
	| 'bili-search'
	| 'bili-video'
	| 'bili-user'
	| 'bili-videos'
	| 'bili-hot'
	| 'bili-ranking'
	| 'bili-related'
	| 'bili-comments';

type Props = {
	readonly browseType: BiliBrowseType;
	readonly query: string;
	readonly flags: GlobalFlags;
	readonly limit?: number;
	readonly format?: 'human' | 'json';
};

function formatCount(n: number): string {
	if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
	if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
	return String(n);
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

function truncate(text: string, max = 60): string {
	const clean = text
		.replaceAll('\n', ' ')
		.replaceAll(/<[^>]*>/g, '')
		.trim();
	return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

export default function BiliBrowseCommand({
	browseType,
	query,
	flags,
	limit = 10,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [lines, setLines] = useState<Array<{key: string; value: string}>>([]);
	const [title, setTitle] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		// Each browse mode maps a different API payload into terminal rows.
		// eslint-disable-next-line complexity
		const run = async () => {
			try {
				const cookieStore = new BiliCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const api = new BiliApi(cookieStore);
				const results: Array<{key: string; value: string}> = [];

				switch (browseType) {
					case 'bili-search': {
						setTitle(`Bilibili 搜索: ${query}`);
						const items = await api.search(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(items, null, 2));
							break;
						}

						for (const [i, item] of items.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(item.title, 40)}  @${
									item.author
								}  ▶️${formatCount(item.play)}  ${item.duration}`,
							});
						}

						break;
					}

					case 'bili-video': {
						setTitle(`Bilibili 视频: ${query}`);
						const info = await api.getVideoInfo(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(info, null, 2));
							break;
						}

						results.push(
							{key: '标题', value: info.title},
							{
								key: 'UP主',
								value: `${info.owner.name} (UID: ${info.owner.mid})`,
							},
							{key: 'BV号', value: info.bvid},
							{key: '分区', value: info.tname || '-'},
							{key: '时长', value: formatDuration(info.duration)},
							{key: '简介', value: truncate(info.desc || '-', 200)},
							{key: '播放', value: formatCount(info.stat.view)},
							{key: '点赞', value: formatCount(info.stat.like)},
							{key: '投币', value: formatCount(info.stat.coin)},
							{key: '收藏', value: formatCount(info.stat.favorite)},
							{key: '弹幕', value: formatCount(info.stat.danmaku)},
							{key: '评论', value: formatCount(info.stat.reply)},
							{key: '分享', value: formatCount(info.stat.share)},
						);

						// Show subtitle availability
						try {
							const subs = await api.getSubtitles(query);
							results.push({key: '字幕', value: subs ? '有' : '无'});
						} catch {
							results.push({key: '字幕', value: '未知'});
						}

						break;
					}

					case 'bili-user': {
						setTitle(`Bilibili 用户: ${query}`);
						const user = await api.getUserInfo(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(user, null, 2));
							break;
						}

						results.push(
							{key: '昵称', value: user.name},
							{key: 'UID', value: String(user.mid)},
							{key: '签名', value: truncate(user.sign || '-', 100)},
							{key: '粉丝', value: formatCount(user.follower ?? 0)},
							{key: '关注', value: formatCount(user.following ?? 0)},
						);
						if (user.archive_count !== undefined) {
							results.push({
								key: '视频',
								value: formatCount(user.archive_count),
							});
						}

						break;
					}

					case 'bili-videos': {
						setTitle(`用户 ${query} 的视频`);
						const data = await api.getUserVideos(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(data, null, 2));
							break;
						}

						for (const [i, v] of data.list.vlist.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(v.title, 40)}  ▶️${formatCount(v.play)}  ${
									v.length
								}`,
							});
						}

						if (data.page?.count) {
							results.push({key: '总计', value: `${data.page.count} 个视频`});
						}

						break;
					}

					case 'bili-hot': {
						setTitle('Bilibili 热门视频');
						const items = await api.getHotVideos();
						if (format === 'json') {
							setJsonOutput(JSON.stringify(items, null, 2));
							break;
						}

						for (const [i, item] of items.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(item.title, 40)}  @${
									item.owner.name
								}  ▶️${formatCount(item.stat.view)}`,
							});
						}

						break;
					}

					case 'bili-ranking': {
						setTitle('Bilibili 排行榜');
						const items = await api.getRanking();
						if (format === 'json') {
							setJsonOutput(JSON.stringify(items, null, 2));
							break;
						}

						for (const [i, item] of items.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(item.title, 40)}  @${
									item.owner.name
								}  ▶️${formatCount(item.stat.view)}  分${item.score}`,
							});
						}

						break;
					}

					case 'bili-related': {
						setTitle(`相关视频: ${query}`);
						const items = await api.getRelatedVideos(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(items, null, 2));
							break;
						}

						for (const [i, item] of items.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(item.title, 40)}  @${
									item.owner.name
								}  ▶️${formatCount(item.stat.view)}`,
							});
						}

						break;
					}

					case 'bili-comments': {
						setTitle(`视频评论: ${query}`);
						const comments = await api.getComments(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(comments, null, 2));
							break;
						}

						for (const [i, c] of comments.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${c.member.uname}: ${truncate(
									c.content.message,
									50,
								)}  👍${formatCount(c.like)}`,
							});
						}

						break;
					}

					default: {
						throw new Error('Unsupported Bilibili browse type');
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

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion='请检查参数或运行 "zget bili login" 登录后重试'
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
