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

type Props = {
	readonly text: string; // Title for submit
	readonly content?: string; // URL or text body
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

function isLikelyUrl(input: string): boolean {
	return /^https?:\/\//i.test(input.trim());
}

export default function HnPublishCommand({
	text,
	content,
	flags,
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
				if (!text?.trim()) {
					throw new CliError('hn submit 需要 --text "<title>"', ExitCode.USAGE);
				}

				if (!content?.trim()) {
					throw new CliError(
						'hn submit 需要 --content "<url-or-text>"',
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
				const asText = !isLikelyUrl(content);
				const result = await api.submit(text, content, {asText});
				const targetUrl = result.url;
				setMessage(`已发布: ${targetUrl}`);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: true,
								data: {
									itemId: result.itemId,
									url: targetUrl,
									kind: asText ? 'text' : 'url',
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
