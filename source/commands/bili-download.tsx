import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {BiliCookieStore} from '../core/auth/bili-auth';
import {BiliApi} from '../core/api/bili-api';
import {downloadBiliVideo} from '../core/downloader/platforms/bili-downloader';
import type {
	DownloadProgress as ProgressType,
	DownloadResult,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import ContentPreview from '../components/content-preview';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly bvid: string;
	readonly flags: GlobalFlags;
};

export default function BiliDownloadCommand({bvid, flags}: Props) {
	const {exit} = useInkApp();
	const [progress, setProgress] = useState<ProgressType>({
		phase: 'fetching',
		message: '初始化...',
	});
	const [result, setResult] = useState<DownloadResult | undefined>();
	const [error, setError] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			try {
				const cookieStore = new BiliCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const api = new BiliApi(cookieStore);

				const downloadResult = await downloadBiliVideo(bvid, api, {
					outputDir: flags.output,
					downloadImages: flags.images,
					verbose: flags.verbose,
					onProgress: setProgress,
				});

				setResult(downloadResult);
			} catch (error_: unknown) {
				setError(error_ instanceof Error ? error_.message : String(error_));
			} finally {
				setTimeout(() => {
					exit();
				}, 100);
			}
		};

		void run();
	});

	if (error) {
		return <ErrorDisplay message={error} suggestion="请检查视频链接是否正确" />;
	}

	if (result) {
		return <ContentPreview result={result} />;
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget - 下载 Bilibili 视频内容</Text>
			<DownloadProgress progress={progress} />
		</Box>
	);
}
