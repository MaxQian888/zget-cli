import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {RedditCredentialStore} from '../core/auth/reddit-auth';
import {RedditApi} from '../core/api/reddit-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import {
	CliError,
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {GlobalFlags} from './types';

export type RedditInteractType =
	| 'reddit-upvote'
	| 'reddit-downvote'
	| 'reddit-unvote'
	| 'reddit-save'
	| 'reddit-unsave'
	| 'reddit-subscribe'
	| 'reddit-unsubscribe'
	| 'reddit-comment'
	| 'reddit-delete';

type Props = {
	readonly interactType: RedditInteractType;
	readonly target: string;
	readonly text?: string;
	readonly flags: GlobalFlags;
	readonly isConfirmed?: boolean;
	readonly format?: 'human' | 'json';
};

// Reddit "fullname" prefixes by thing kind: t1_ = comment, t3_ = post (link),
// t5_ = subreddit. Most votes/saves accept either; we accept bare IDs and
// auto-prefix as posts when no prefix is present.
function asFullname(raw: string, defaultPrefix: string): string {
	if (/^t[1-6]_/i.test(raw)) return raw;
	return `${defaultPrefix}${raw}`;
}

export default function RedditInteractCommand({
	interactType,
	target,
	text,
	flags: _flags,
	isConfirmed,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading',
	);
	const [message, setMessage] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				if (!target) {
					throw new CliError(
						`${interactType} 需要一个 target 参数`,
						ExitCode.USAGE,
					);
				}

				const credStore = new RedditCredentialStore();
				await credStore.load();
				if (!credStore.isAuthenticated()) {
					throw new CliError(
						'未登录，请先运行 "zget reddit login"',
						ExitCode.NOPERM,
						'zget reddit login',
					);
				}

				const api = new RedditApi(credStore);
				let result: unknown;

				switch (interactType) {
					case 'reddit-upvote': {
						result = await api.upvote(asFullname(target, 't3_'));
						setMessage(`已 upvote ${target}`);
						break;
					}

					case 'reddit-downvote': {
						result = await api.downvote(asFullname(target, 't3_'));
						setMessage(`已 downvote ${target}`);
						break;
					}

					case 'reddit-unvote': {
						result = await api.unvote(asFullname(target, 't3_'));
						setMessage(`已取消投票 ${target}`);
						break;
					}

					case 'reddit-save': {
						result = await api.save(asFullname(target, 't3_'));
						setMessage(`已保存 ${target}`);
						break;
					}

					case 'reddit-unsave': {
						result = await api.unsave(asFullname(target, 't3_'));
						setMessage(`已取消保存 ${target}`);
						break;
					}

					case 'reddit-subscribe': {
						result = await api.subscribe(target);
						setMessage(`已订阅 r/${target}`);
						break;
					}

					case 'reddit-unsubscribe': {
						result = await api.unsubscribe(target);
						setMessage(`已取消订阅 r/${target}`);
						break;
					}

					case 'reddit-comment': {
						if (!text?.trim()) {
							throw new CliError(
								'reddit comment 需要 --text "<内容>"',
								ExitCode.USAGE,
							);
						}

						result = await api.comment(asFullname(target, 't3_'), text);
						setMessage(`已在 ${target} 评论`);
						break;
					}

					case 'reddit-delete': {
						if (!isConfirmed) {
							throw new CliError(
								`reddit delete 是不可逆操作，请添加 --yes 确认删除 ${target}`,
								ExitCode.USAGE,
							);
						}

						result = await api.deleteThing(asFullname(target, 't3_'));
						setMessage(`已删除 ${target}`);
						break;
					}

					default: {
						throw new CliError(
							`Unsupported Reddit interact type: ${interactType as string}`,
							ExitCode.USAGE,
						);
					}
				}

				if (format === 'json') {
					setJsonOutput(JSON.stringify({ok: true, data: result}, null, 2));
				}

				setStatus('success');
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				pendingExitCode = getExitCode(error);
				const hint = getErrorHint(error);
				setStatus('error');
				setMessage(errorMessage);
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
			} finally {
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

	if (status === 'error') {
		return <ErrorDisplay message={message} />;
	}

	if (status === 'success') {
		return (
			<Box>
				<Text bold color="green">
					✓ {message}
				</Text>
			</Box>
		);
	}

	return (
		<Box>
			<Spinner label="" />
			<Text> 正在处理...</Text>
		</Box>
	);
}
