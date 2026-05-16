import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {V2exTokenStore} from '../core/auth/v2ex-auth';
import {V2exApi} from '../core/api/v2ex-api';
import {downloadV2exTopic} from '../core/downloader/platforms/v2ex-downloader';
import type {
	DownloadProgress as ProgressType,
	DownloadResult,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import ContentPreview from '../components/content-preview';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly topicId: string;
	readonly flags: GlobalFlags;
};

export default function V2exDownloadCommand({topicId, flags}: Props) {
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
				const store = new V2exTokenStore();
				await store.load();
				const api = new V2exApi(store);

				const downloadResult = await downloadV2exTopic(topicId, api, {
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
			<ErrorDisplay message={error} suggestion="请检查 V2EX 主题 ID 是否正确" />
		);
	}

	if (result) {
		return <ContentPreview result={result} />;
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget - 下载 V2EX 主题</Text>
			<DownloadProgress progress={progress} />
		</Box>
	);
}
