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

type Props = {
	readonly node: string;
	readonly text: string; // Title
	readonly content?: string; // Body
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function V2exPublishCommand({
	node,
	text,
	content,
	flags: _flags,
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
				if (!node) {
					throw new CliError(
						'v2ex new-topic 需要一个节点名 (v2ex new-topic <node>)',
						ExitCode.USAGE,
					);
				}

				if (!text?.trim()) {
					throw new CliError(
						'v2ex new-topic 需要 --text "<title>"',
						ExitCode.USAGE,
					);
				}

				if (!content?.trim()) {
					throw new CliError(
						'v2ex new-topic 需要 --content "<body>"',
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
				const result = await api.newTopic(node, text, content);
				setMessage(`已发布主题: ${result.url}`);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: true,
								data: {
									topicId: result.topicId,
									url: result.url,
									node,
								},
							},
							null,
							2,
						),
					);
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
			<Text> 正在发布...</Text>
		</Box>
	);
}
