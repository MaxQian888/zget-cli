import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {WeiboCookieStore} from '../core/auth/weibo-auth';
import {WeiboApi} from '../core/api/weibo-api';
import {uploadWeiboImage} from '../core/api/weibo-image-upload';
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
	readonly text: string;
	readonly images?: string[];
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

const MAX_IMAGES = 9;

export default function WeiboPublishCommand({
	text,
	images,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [phase, setPhase] = useState('准备发布...');
	const [error, setError] = useState<string | undefined>();
	const [resultMessage, setResultMessage] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				if (!text || text.trim().length === 0) {
					throw new CliError('微博正文不能为空', ExitCode.NO_INPUT);
				}

				const imagePaths = images ?? [];
				if (imagePaths.length > MAX_IMAGES) {
					throw new CliError(
						`最多支持 ${MAX_IMAGES} 张图片，当前 ${imagePaths.length} 张`,
						ExitCode.USAGE,
					);
				}

				const cookieStore = new WeiboCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				if (!cookieStore.isAuthenticated()) {
					throw new CliError(
						'未登录，请先运行 "zget weibo login"',
						ExitCode.NOPERM,
						'运行 zget weibo login',
					);
				}

				const api = new WeiboApi(cookieStore);
				const picIds: string[] = [];

				for (const [index, imagePath] of imagePaths.entries()) {
					setPhase(`正在上传图片 ${index + 1}/${imagePaths.length}...`);
					// eslint-disable-next-line no-await-in-loop
					const picId = await uploadWeiboImage(imagePath, cookieStore);
					picIds.push(picId);
				}

				setPhase('正在发布微博...');
				const result = await api.publishStatus(text, picIds);

				if (format === 'json') {
					setJsonOutput(JSON.stringify({ok: true, data: result}, null, 2));
				}

				setResultMessage(`微博已发布 (mid: ${result.mid})`);
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
								error: {
									code: pendingExitCode,
									message: errorMessage,
									hint,
								},
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
				suggestion="请确保已登录并提供有效的正文/图片路径"
			/>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> {phase}</Text>
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
