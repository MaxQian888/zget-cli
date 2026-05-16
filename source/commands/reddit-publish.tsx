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

type Props = {
	readonly subreddit: string;
	readonly text: string; // Title
	readonly content?: string; // URL (if starts with http) OR self-text body
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

function isLikelyUrl(input?: string): boolean {
	return Boolean(input && /^https?:\/\//i.test(input.trim()));
}

export default function RedditPublishCommand({
	subreddit,
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
				if (!subreddit) {
					throw new CliError(
						'reddit submit 需要 subreddit (zget reddit submit <subreddit>)',
						ExitCode.USAGE,
					);
				}

				if (!text?.trim()) {
					throw new CliError(
						'reddit submit 需要 --text "<title>"',
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
				const isUrl = isLikelyUrl(content);
				const result = await api.submit({
					subreddit,
					title: text,
					url: isUrl ? content : undefined,
					text: isUrl ? undefined : content,
				});
				const targetUrl = result.url ?? '(unknown URL)';
				setMessage(`已发布: ${targetUrl}`);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: true,
								data: {
									postId: result.postId,
									url: result.url,
									subreddit,
									kind: isUrl ? 'link' : 'self',
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
			<Text> 正在提交...</Text>
		</Box>
	);
}
