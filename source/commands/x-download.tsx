import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {XCredentialStore} from '../core/auth/x-auth';
import {XApi} from '../core/api/x-api';
import {downloadTweet} from '../core/downloader/platforms/x-downloader';
import type {
	DownloadProgress as ProgressType,
	DownloadResult,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import ContentPreview from '../components/content-preview';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly url: string;
	readonly flags: GlobalFlags;
};

export default function TwitterDownloadCommand({url, flags}: Props) {
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
				const credStore = new XCredentialStore();
				await credStore.load();
				const api = new XApi(credStore);

				const tweetId = api.parseTweetId(url);
				const downloadResult = await downloadTweet(tweetId, api, {
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
		return (
			<ErrorDisplay
				message={error}
				suggestion="请检查推文链接和 X API 凭证是否正确"
			/>
		);
	}

	if (result) {
		return <ContentPreview result={result} />;
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget - 下载 X 推文</Text>
			<DownloadProgress progress={progress} />
		</Box>
	);
}
