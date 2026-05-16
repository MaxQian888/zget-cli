import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {HnCookieStore} from '../core/auth/hn-auth';
import {HnApi} from '../core/api/hn-api';
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

export type HnInteractType =
	| 'hn-upvote'
	| 'hn-unvote'
	| 'hn-favorite'
	| 'hn-unfavorite'
	| 'hn-comment'
	| 'hn-delete';

type Props = {
	readonly interactType: HnInteractType;
	readonly target: string;
	readonly text?: string;
	readonly flags: GlobalFlags;
	readonly isConfirmed?: boolean;
	readonly format?: 'human' | 'json';
};

export default function HnInteractCommand({
	interactType,
	target,
	text,
	flags,
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
						`${interactType} 需要一个 item ID 参数`,
						ExitCode.USAGE,
					);
				}

				const cookieStore = new HnCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				if (!cookieStore.isAuthenticated()) {
					throw new CliError(
						'未登录，请先运行 "zget hn login"',
						ExitCode.NOPERM,
						'zget hn login',
					);
				}

				const api = new HnApi(cookieStore);
				let result: unknown;

				switch (interactType) {
					case 'hn-upvote': {
						result = await api.upvote(target);
						setMessage(`已 upvote item #${target}`);
						break;
					}

					case 'hn-unvote': {
						result = await api.unvote(target);
						setMessage(`已取消 upvote item #${target}`);
						break;
					}

					case 'hn-favorite': {
						result = await api.favorite(target);
						setMessage(`已收藏 item #${target}`);
						break;
					}

					case 'hn-unfavorite': {
						result = await api.unfavorite(target);
						setMessage(`已取消收藏 item #${target}`);
						break;
					}

					case 'hn-comment': {
						if (!text?.trim()) {
							throw new CliError(
								'hn comment 需要 --text "<comment body>"',
								ExitCode.USAGE,
							);
						}

						result = await api.comment(target, text);
						setMessage(`已在 item #${target} 发表评论`);
						break;
					}

					case 'hn-delete': {
						if (!isConfirmed) {
							throw new CliError(
								`hn delete 是不可逆操作，请添加 --yes 确认删除 item #${target}`,
								ExitCode.USAGE,
							);
						}

						result = await api.delete(target);
						setMessage(`已删除 item #${target}`);
						break;
					}

					default: {
						throw new CliError(
							`Unsupported HN interact type: ${interactType as string}`,
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
