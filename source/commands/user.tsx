import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {ApiClient} from '../core/api/client';
import {ZhihuApi} from '../core/api/zhihu-api';
import {CookieStore} from '../core/auth/cookie-store';
import {downloadUserContent} from '../core/downloader/user-downloader';
import {parseZhihuUrl} from '../core/utils/url-parser';
import type {
	DownloadProgress as ProgressType,
	BatchProgress as BatchProgressType,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import BatchProgressComponent from '../components/batch-progress';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type CompletedItem = {
	id: string;
	title: string;
	success: boolean;
};

type Props = {
	readonly url: string;
	readonly flags: GlobalFlags;
};

export default function UserCommand({url, flags}: Props) {
	const {exit} = useInkApp();
	const [progress, setProgress] = useState<ProgressType>({
		phase: 'fetching',
		message: '初始化...',
	});
	const [batchProgress, setBatchProgress] = useState<
		BatchProgressType | undefined
	>();
	const [completedItems, setCompletedItems] = useState<CompletedItem[]>([]);
	const [isFinished, setIsFinished] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [summary, setSummary] = useState<string>('');

	useRunOnceEffect(() => {
		const run = async () => {
			try {
				const cookieStore = new CookieStore();
				await cookieStore.load();
				if (flags.cookies) {
					cookieStore.parseCookieString(flags.cookies);
				}

				const client = new ApiClient({cookieStore});
				const api = new ZhihuApi(client);

				const parsed = parseZhihuUrl(url);
				const userId =
					parsed.platform === 'zhihu' && parsed.type === 'user'
						? parsed.userId
						: url;

				const result = await downloadUserContent(userId, api, client, {
					outputDir: flags.output,
					downloadImages: flags.images,
					verbose: flags.verbose,
					resume: flags.resume,
					onProgress: setProgress,
					onBatchProgress(bp) {
						setBatchProgress(bp);
						if (bp.currentItem) {
							setCompletedItems(previous => {
								const exists = previous.some(i => i.id === bp.currentItem);
								if (exists) return previous;
								return [
									...previous,
									{
										id: bp.currentItem!,
										title: bp.currentItem!,
										success: true,
									},
								];
							});
						}
					},
				});

				setSummary(
					`用户 "${result.userName}" 内容下载完成: ${result.success} 成功, ${result.failed} 失败`,
				);
				setIsFinished(true);
			} catch (error_: unknown) {
				const message =
					error_ instanceof Error ? error_.message : String(error_);
				setError(message);
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
				suggestion="请检查用户链接是否正确，或运行 zget login 登录后重试"
			/>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget - 下载用户内容</Text>

			{!batchProgress && <DownloadProgress progress={progress} />}

			{batchProgress && (
				<BatchProgressComponent
					completed={completedItems}
					current={batchProgress.currentItem}
					successCount={batchProgress.completed}
					failedCount={batchProgress.failed}
					total={batchProgress.total}
					isFinished={isFinished}
				/>
			)}

			{summary && (
				<Box marginTop={1}>
					<Text color="green">{summary}</Text>
				</Box>
			)}
		</Box>
	);
}
