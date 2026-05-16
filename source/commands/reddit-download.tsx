import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {RedditCredentialStore} from '../core/auth/reddit-auth';
import {RedditApi} from '../core/api/reddit-api';
import {downloadRedditPost} from '../core/downloader/platforms/reddit-downloader';
import type {
	DownloadProgress as ProgressType,
	DownloadResult,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import ContentPreview from '../components/content-preview';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly postId: string;
	readonly subreddit?: string;
	readonly flags: GlobalFlags;
};

export default function RedditDownloadCommand({
	postId,
	subreddit,
	flags,
}: Props) {
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
				const credStore = new RedditCredentialStore();
				await credStore.load();
				const api = new RedditApi(credStore);

				const downloadResult = await downloadRedditPost(postId, api, {
					outputDir: flags.output,
					downloadImages: flags.images,
					verbose: flags.verbose,
					subreddit,
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
				suggestion="请检查 Reddit post ID 是否正确"
			/>
		);
	}

	if (result) {
		return <ContentPreview result={result} />;
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget - 下载 Reddit 帖子</Text>
			<DownloadProgress progress={progress} />
		</Box>
	);
}
