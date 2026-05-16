import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {V2exTokenStore} from '../core/auth/v2ex-auth';
import {V2exApi} from '../core/api/v2ex-api';
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

export type V2exInteractType =
	| 'v2ex-collect'
	| 'v2ex-uncollect'
	| 'v2ex-thank-topic'
	| 'v2ex-thank-reply'
	| 'v2ex-reply'
	| 'v2ex-delete-reply';

type Props = {
	readonly interactType: V2exInteractType;
	readonly target: string;
	readonly text?: string;
	readonly flags: GlobalFlags;
	readonly isConfirmed?: boolean;
	readonly format?: 'human' | 'json';
};

export default function V2exInteractCommand({
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
						`${interactType} 需要一个 ID 参数`,
						ExitCode.USAGE,
					);
				}

				const store = new V2exTokenStore();
				await store.load();
				if (!store.isAuthenticated()) {
					throw new CliError(
						'未登录，请先运行 "zget v2ex login --cookie <token>"',
						ExitCode.NOPERM,
						'zget v2ex login',
					);
				}

				const api = new V2exApi(store);
				let result: unknown;

				switch (interactType) {
					case 'v2ex-collect': {
						result = await api.collect(target);
						setMessage(`已收藏主题 #${target}`);
						break;
					}

					case 'v2ex-uncollect': {
						result = await api.uncollect(target);
						setMessage(`已取消收藏主题 #${target}`);
						break;
					}

					case 'v2ex-thank-topic': {
						result = await api.thankTopic(target);
						setMessage(`已感谢主题 #${target}`);
						break;
					}

					case 'v2ex-thank-reply': {
						result = await api.thankReply(target);
						setMessage(`已感谢回复 #${target}`);
						break;
					}

					case 'v2ex-reply': {
						if (!text?.trim()) {
							throw new CliError(
								'v2ex reply 需要 --text "<回复内容>"',
								ExitCode.USAGE,
							);
						}

						result = await api.reply(target, text);
						setMessage(`已回复主题 #${target}`);
						break;
					}

					case 'v2ex-delete-reply': {
						if (!isConfirmed) {
							throw new CliError(
								`v2ex delete-reply 是不可逆操作，请添加 --yes 确认删除 #${target}`,
								ExitCode.USAGE,
							);
						}

						result = await api.deleteReply(target);
						setMessage(`已删除回复 #${target}`);
						break;
					}

					default: {
						throw new CliError(
							`Unsupported V2EX interact type: ${interactType as string}`,
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
