import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {XhsCookieStore} from '../core/auth/xhs-auth';
import {XhsApi} from '../core/api/xhs-api';
import {downloadXhsNote} from '../core/downloader/platforms/xhs-downloader';
import type {
	DownloadProgress as ProgressType,
	DownloadResult,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import ContentPreview from '../components/content-preview';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly noteId: string;
	readonly flags: GlobalFlags;
};

export default function XhsDownloadCommand({noteId, flags}: Props) {
	const {exit} = useInkApp();
	const [progress, setProgress] = useState<ProgressType>({
		phase: 'fetching',
		message: '初始化...',
	});
	const [result, setResult] = useState<DownloadResult | undefined>();
	const [error, setError] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			let xhsApi: XhsApi | undefined;
			try {
				const cookieStore = new XhsCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				xhsApi = new XhsApi(cookieStore);
				await xhsApi.init();

				const downloadResult = await downloadXhsNote(noteId, xhsApi, {
					outputDir: flags.output,
					downloadImages: flags.images,
					verbose: flags.verbose,
					onProgress: setProgress,
				});

				setResult(downloadResult);
			} catch (error_: unknown) {
				setError(error_ instanceof Error ? error_.message : String(error_));
			} finally {
				if (xhsApi) await xhsApi.close();
				setTimeout(() => {
					exit();
				}, 100);
			}
		};

		void run();
	});

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion='请检查笔记链接，或运行 "zget xhs login" 登录后重试'
			/>
		);
	}

	if (result) {
		return <ContentPreview result={result} />;
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget - 下载小红书笔记</Text>
			<DownloadProgress progress={progress} />
		</Box>
	);
}
