import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {XhsCookieStore} from '../core/auth/xhs-auth';
import {XhsApi} from '../core/api/xhs-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type XhsBrowseType =
	| 'xhs-search'
	| 'xhs-read'
	| 'xhs-feed'
	| 'xhs-topics'
	| 'xhs-user'
	| 'xhs-posts'
	| 'xhs-followers'
	| 'xhs-following';

type Props = {
	readonly browseType: XhsBrowseType;
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

function truncate(text: string, max = 60): string {
	const clean = text.replaceAll('\n', ' ').trim();
	return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

export default function XhsBrowseCommand({
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
			let xhsApi: XhsApi | undefined;
			try {
				const cookieStore = new XhsCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				xhsApi = new XhsApi(cookieStore);
				await xhsApi.init();
				const results: Array<{key: string; value: string}> = [];

				switch (browseType) {
					case 'xhs-search': {
						setTitle(`小红书搜索: ${query}`);
						const items = await xhsApi.searchNotes(query, limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(items, null, 2));
							break;
						}

						for (const [i, item] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(item.title || item.description, 40)}  @${
									item.user.nickname
								}  ❤️${formatCount(item.likeCount)}`,
							});
						}

						break;
					}

					case 'xhs-read': {
						setTitle(`小红书笔记: ${query}`);
						const {note, comments} = await xhsApi.getNoteWithComments(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify({note, comments}, null, 2));
							break;
						}

						results.push(
							{key: '标题', value: note.title || '-'},
							{key: '作者', value: note.user.nickname},
							{key: '类型', value: note.type === 'video' ? '视频' : '图文'},
							{key: '内容', value: truncate(note.description, 200)},
							{key: '图片', value: `${note.imageList.length} 张`},
							{key: '点赞', value: formatCount(note.likeCount)},
							{key: '收藏', value: formatCount(note.collectCount)},
							{key: '评论', value: formatCount(note.commentCount)},
						);

						if (comments.length > 0) {
							results.push({key: '---', value: '热门评论'});
							for (const [i, c] of comments.slice(0, 5).entries()) {
								results.push({
									key: `评${i + 1}`,
									value: `${c.nickname}: ${truncate(c.content, 40)}`,
								});
							}
						}

						break;
					}

					case 'xhs-feed': {
						setTitle('小红书推荐');
						const items = await xhsApi.getFeed(limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(items, null, 2));
							break;
						}

						for (const [i, item] of items.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(item.title || item.description, 40)}  @${
									item.user.nickname
								}  ❤️${formatCount(item.likeCount)}`,
							});
						}

						break;
					}

					case 'xhs-topics': {
						setTitle(`小红书话题: ${query}`);
						const topics = await xhsApi.getTopics(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(topics, null, 2));
							break;
						}

						for (const [i, topic] of topics.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `#${topic.name}  笔记: ${formatCount(
									topic.noteCount ?? 0,
								)}  浏览: ${formatCount(topic.viewCount ?? 0)}`,
							});
						}

						break;
					}

					case 'xhs-user': {
						setTitle(`小红书用户: ${query}`);
						const user = await xhsApi.getUserProfile(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(user, null, 2));
							break;
						}

						results.push(
							{key: '昵称', value: user.nickname},
							{key: '简介', value: truncate(user.description ?? '-', 100)},
							{key: '笔记', value: formatCount(user.noteCount ?? 0)},
							{key: '粉丝', value: formatCount(user.followerCount ?? 0)},
							{key: '关注', value: formatCount(user.followingCount ?? 0)},
							{key: '获赞', value: formatCount(user.likeCount ?? 0)},
							{key: '收藏', value: formatCount(user.collectedCount ?? 0)},
						);
						if (user.ipLocation)
							results.push({key: 'IP属地', value: user.ipLocation});
						break;
					}

					case 'xhs-posts': {
						setTitle(`用户 ${query} 的笔记`);
						const notes = await xhsApi.getUserNotes(query, limit);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(notes, null, 2));
							break;
						}

						for (const [i, note] of notes.entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${truncate(
									note.title || note.description,
									40,
								)}  ❤️${formatCount(note.likeCount)}`,
							});
						}

						break;
					}

					case 'xhs-followers': {
						setTitle(`用户 ${query} 的粉丝`);
						const users = await xhsApi.getFollowers(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(users, null, 2));
							break;
						}

						for (const [i, user] of users.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${user.nickname}  粉丝: ${formatCount(
									user.followerCount ?? 0,
								)}`,
							});
						}

						break;
					}

					case 'xhs-following': {
						setTitle(`用户 ${query} 的关注`);
						const users = await xhsApi.getFollowing(query);
						if (format === 'json') {
							setJsonOutput(JSON.stringify(users, null, 2));
							break;
						}

						for (const [i, user] of users.slice(0, limit).entries()) {
							results.push({
								key: `${i + 1}`,
								value: `${user.nickname}  粉丝: ${formatCount(
									user.followerCount ?? 0,
								)}`,
							});
						}

						break;
					}

					default: {
						throw new Error('Unsupported Xiaohongshu browse type');
					}
				}

				setLines(results);
				setLoading(false);
			} catch (error_: unknown) {
				setError(error_ instanceof Error ? error_.message : String(error_));
				setLoading(false);
			} finally {
				if (xhsApi) await xhsApi.close();
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
				suggestion='请运行 "zget xhs login" 登录后重试。确保已安装 Playwright: npx playwright install chromium'
			/>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> 正在加载 (启动浏览器中)...</Text>
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
