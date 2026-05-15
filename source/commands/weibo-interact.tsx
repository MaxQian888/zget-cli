import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {WeiboCookieStore} from '../core/auth/weibo-auth';
import {WeiboApi} from '../core/api/weibo-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import InteractResult from '../components/interact-result';
import {
	CliError,
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {WeiboInteractResult} from '../types/weibo';
import type {GlobalFlags} from './types';

type WeiboInteractType =
	| 'weibo-like'
	| 'weibo-unlike'
	| 'weibo-repost'
	| 'weibo-comment'
	| 'weibo-delete'
	| 'weibo-follow'
	| 'weibo-unfollow';

type Props = {
	readonly interactType: WeiboInteractType;
	readonly target: string;
	readonly text?: string;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function WeiboInteractCommand({
	interactType,
	target,
	text,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [success, setSuccess] = useState(false);
	const [message, setMessage] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const cookieStore = new WeiboCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const api = new WeiboApi(cookieStore);
				let result: WeiboInteractResult;

				switch (interactType) {
					case 'weibo-like': {
						result = await api.like(target);
						setMessage(`已点赞微博 ${target}`);
						break;
					}

					case 'weibo-unlike': {
						result = await api.unlike(target);
						setMessage(`已取消点赞 ${target}`);
						break;
					}

					case 'weibo-repost': {
						const status = await api.getStatus(target);
						result = await api.repost(
							status.idstr,
							status.mid,
							text ?? '转发微博',
						);
						setMessage(`已转发微博 ${target}`);
						break;
					}

					case 'weibo-comment': {
						if (!text) {
							throw new CliError(
								'缺少评论内容，请使用 --text 提供',
								ExitCode.NO_INPUT,
							);
						}

						const status = await api.getStatus(target);
						result = await api.comment(status.idstr, status.mid, text);
						setMessage(`已评论微博 ${target}`);
						break;
					}

					case 'weibo-delete': {
						result = await api.destroy(target);
						setMessage(`已删除微博 ${target}`);
						break;
					}

					case 'weibo-follow': {
						result = await api.follow(target);
						setMessage(`已关注用户 ${target}`);
						break;
					}

					case 'weibo-unfollow': {
						result = await api.unfollow(target);
						setMessage(`已取消关注 ${target}`);
						break;
					}

					default: {
						throw new Error('Unsupported Weibo interact type');
					}
				}

				if (format === 'json') {
					setJsonOutput(JSON.stringify({ok: true, data: result}, null, 2));
				}

				setSuccess(true);
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
				suggestion='请运行 "zget weibo login" 登录后重试'
			/>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> 正在处理...</Text>
			</Box>
		);
	}

	return <InteractResult isSuccess={success} message={message} />;
}
