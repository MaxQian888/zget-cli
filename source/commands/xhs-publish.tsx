import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {XhsCookieStore} from '../core/auth/xhs-auth';
import {XhsApi} from '../core/api/xhs-api';
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
	readonly title: string;
	readonly content?: string;
	readonly images?: string[];
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function XhsPublishCommand({
	title,
	content,
	images,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [resultMessage, setResultMessage] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			let xhsApi: XhsApi | undefined;
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const cookieStore = new XhsCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				if (!cookieStore.isAuthenticated()) {
					throw new CliError(
						'未登录，请先运行 "zget xhs login"',
						ExitCode.NOPERM,
						'运行 zget xhs login',
					);
				}

				xhsApi = new XhsApi(cookieStore);
				await xhsApi.init();

				const result = await xhsApi.publishImageNote(
					title,
					content ?? '',
					images ?? [],
				);

				if (format === 'json') {
					setJsonOutput(JSON.stringify({ok: true, data: result}, null, 2));
				}

				setResultMessage(`笔记已发布 (ID: ${result.noteId})`);
				setLoading(false);
			} catch (error_: unknown) {
				const message =
					error_ instanceof Error ? error_.message : String(error_);
				pendingExitCode = getExitCode(error_);
				const hint = getErrorHint(error_);
				setError(message);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{ok: false, error: {code: pendingExitCode, message, hint}},
							null,
							2,
						),
					);
				}

				setLoading(false);
			} finally {
				if (xhsApi) await xhsApi.close();
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
		return <ErrorDisplay message={error} suggestion="请确保已登录创作者中心" />;
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> 正在发布笔记...</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold color="green">
				✓ {resultMessage}
			</Text>
		</Box>
	);
}
