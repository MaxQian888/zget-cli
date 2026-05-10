import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {CookieStore} from '../core/auth/cookie-store';
import {ApiClient} from '../core/api/client';
import {ZhihuApi} from '../core/api/zhihu-api';
import type {ZhihuCommentTarget} from '../core/api/types';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type ZhihuListKind =
	| 'zhihu-followers'
	| 'zhihu-following'
	| 'zhihu-collections'
	| 'zhihu-notifications'
	| 'zhihu-drafts'
	| 'zhihu-comments';

type Props = {
	readonly kind: ZhihuListKind;
	readonly target?: string;
	readonly commentTarget?: ZhihuCommentTarget;
	readonly limit?: number;
	readonly offset?: number;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

type ListItem = {
	primary: string;
	secondary?: string;
	id?: string;
};

export default function ZhihuListCommand({
	kind,
	target,
	commentTarget = 'answer',
	limit = 20,
	offset = 0,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [items, setItems] = useState<ListItem[]>([]);
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const store = new CookieStore();
				await store.load();
				if (flags.cookies) store.parseCookieString(flags.cookies);
				if (!store.isAuthenticated()) {
					throw new Error('未登录，请先运行 "zget zhihu login"');
				}

				const api = new ZhihuApi(new ApiClient({cookieStore: store}));
				let rawData: unknown;
				let displayItems: ListItem[] = [];

				switch (kind) {
					case 'zhihu-followers': {
						if (!target) throw new Error('缺少用户标识');
						const result = await api.getFollowers(target, offset, limit);
						rawData = result;
						displayItems = result.items.map(item => ({
							primary: `${item.name} (@${item.urlToken})`,
							secondary: item.headline,
							id: item.id,
						}));
						break;
					}

					case 'zhihu-following': {
						if (!target) throw new Error('缺少用户标识');
						const result = await api.getFollowing(target, offset, limit);
						rawData = result;
						displayItems = result.items.map(item => ({
							primary: `${item.name} (@${item.urlToken})`,
							secondary: item.headline,
							id: item.id,
						}));
						break;
					}

					case 'zhihu-collections': {
						if (!target) throw new Error('缺少用户标识');
						const result = await api.getCollections(target, offset, limit);
						rawData = result;
						displayItems = result.items.map(item => ({
							primary: item.title,
							secondary: `${item.answerCount} 答案 · ${item.followerCount} 关注`,
							id: item.id,
						}));
						break;
					}

					case 'zhihu-notifications': {
						const result = await api.getNotifications(offset, limit);
						rawData = result;
						displayItems = result.items.map(item => ({
							primary: item.content || `(${item.type})`,
							secondary: item.read ? '已读' : '未读',
							id: item.id,
						}));
						break;
					}

					case 'zhihu-drafts': {
						const result = await api.getDrafts(offset, limit);
						rawData = result;
						displayItems = result.items.map(item => ({
							primary: item.title,
							id: item.id,
						}));
						break;
					}

					case 'zhihu-comments': {
						if (!target) throw new Error('缺少目标 ID');
						const result = await api.listComments(
							commentTarget,
							target,
							offset,
							limit,
						);
						rawData = result;
						displayItems = result.items.map(item => ({
							primary: `${item.author.name}: ${item.content}`,
							secondary: `${item.likeCount} 赞`,
							id: item.id,
						}));
						break;
					}

					default: {
						throw new Error(`Unsupported zhihu list kind: ${String(kind)}`);
					}
				}

				setItems(displayItems);
				if (format === 'json') {
					setJsonOutput(JSON.stringify({ok: true, data: rawData}, null, 2));
				}

				setLoading(false);
			} catch (error_: unknown) {
				const errorMessage =
					error_ instanceof Error ? error_.message : String(error_);
				pendingExitCode = getExitCode(error_);
				const hint = getErrorHint(error_);
				setError(errorMessage);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: false,
								error: {code: pendingExitCode, message: errorMessage, hint},
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
				suggestion='请运行 "zget zhihu login" 后重试'
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

	if (items.length === 0) {
		return (
			<Box>
				<Text dimColor>(空)</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{items.map((item, index) => (
				<Box key={item.id ?? index} flexDirection="column" marginBottom={1}>
					<Text>
						<Text dimColor>{`${offset + index + 1}. `}</Text>
						{item.primary}
					</Text>
					{item.secondary ? (
						<Box marginLeft={2}>
							<Text dimColor>{item.secondary}</Text>
						</Box>
					) : null}
				</Box>
			))}
		</Box>
	);
}
