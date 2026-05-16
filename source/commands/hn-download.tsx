import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {HnCookieStore} from '../core/auth/hn-auth';
import {HnApi} from '../core/api/hn-api';
import {downloadHnItem} from '../core/downloader/platforms/hn-downloader';
import type {
	DownloadProgress as ProgressType,
	DownloadResult,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import ContentPreview from '../components/content-preview';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly itemId: string;
	readonly flags: GlobalFlags;
};

export default function HnDownloadCommand({itemId, flags}: Props) {
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
				const cookieStore = new HnCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const api = new HnApi(cookieStore);

				const downloadResult = await downloadHnItem(itemId, api, {
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
			<ErrorDisplay message={error} suggestion="请检查 HN item ID 是否正确" />
		);
	}

	if (result) {
		return <ContentPreview result={result} />;
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget - 下载 Hacker News 内容</Text>
			<DownloadProgress progress={progress} />
		</Box>
	);
}
