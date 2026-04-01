import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {ApiClient} from '../core/api/client';
import {CookieStore} from '../core/auth/cookie-store';
import {
	downloadCsdnArticle,
	downloadCsdnCategory,
	isCsdnCategory,
} from '../core/downloader/platforms/csdn-downloader';
import {downloadWeixinArticle} from '../core/downloader/platforms/weixin-downloader';
import {downloadJuejinArticle} from '../core/downloader/platforms/juejin-downloader';
import type {
	DownloadProgress as ProgressType,
	DownloadResult,
	BatchProgress as BatchProgressType,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import ContentPreview from '../components/content-preview';
import BatchProgressComponent from '../components/batch-progress';
import ErrorDisplay from '../components/error-display';
import type {Platform} from '../core/utils/url-parser';
import type {GlobalFlags} from './types';

type CompletedItem = {
	id: string;
	title: string;
	success: boolean;
};

type Props = {
	readonly platform: Platform;
	readonly url: string;
	readonly flags: GlobalFlags;
	readonly isBatch?: boolean;
};

export default function PlatformDownloadCommand({
	platform,
	url,
	flags,
	isBatch,
}: Props) {
	const {exit} = useInkApp();
	const [progress, setProgress] = useState<ProgressType>({
		phase: 'fetching',
		message: '初始化...',
	});
	const [result, setResult] = useState<DownloadResult | undefined>();
	const [batchProgress, setBatchProgress] = useState<
		BatchProgressType | undefined
	>();
	const [completedItems, setCompletedItems] = useState<CompletedItem[]>([]);
	const [isFinished, setIsFinished] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [summary, setSummary] = useState('');

	const platformNames: Record<string, string> = {
		csdn: 'CSDN',
		weixin: '微信公众号',
		juejin: '掘金',
	};

	useRunOnceEffect(() => {
		const run = async () => {
			try {
				const cookieStore = new CookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const client = new ApiClient({cookieStore, rateLimit: 300});
				const options = {
					outputDir: flags.output,
					downloadImages: flags.images,
					verbose: flags.verbose,
					onProgress: setProgress,
				};
				const shouldBatchDownload = isBatch === true || isCsdnCategory(url);

				if (platform === 'csdn' && shouldBatchDownload) {
					const batchResult = await downloadCsdnCategory(url, client, {
						...options,
						resume: flags.resume,
						onBatchProgress(bp) {
							setBatchProgress(bp);
							if (bp.currentItem) {
								setCompletedItems(previous => {
									if (previous.some(i => i.id === bp.currentItem))
										return previous;
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
						`CSDN 专栏 "${batchResult.folderName}" 下载完成: ${batchResult.success} 成功, ${batchResult.failed} 失败`,
					);
					setIsFinished(true);
				} else {
					let downloadResult: DownloadResult;
					switch (platform) {
						case 'csdn': {
							downloadResult = await downloadCsdnArticle(url, client, options);
							break;
						}

						case 'weixin': {
							downloadResult = await downloadWeixinArticle(
								url,
								client,
								options,
							);
							break;
						}

						case 'juejin': {
							downloadResult = await downloadJuejinArticle(
								url,
								client,
								options,
							);
							break;
						}

						default: {
							throw new Error(`不支持的平台: ${platform}`);
						}
					}

					setResult(downloadResult);
				}
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

	const name = platformNames[platform] ?? platform;

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion={`请检查 ${name} 链接是否正确`}
			/>
		);
	}

	if (result) {
		return <ContentPreview result={result} />;
	}

	if (batchProgress) {
		return (
			<Box flexDirection="column">
				<Text bold>zget - 下载 {name} 专栏</Text>
				<BatchProgressComponent
					completed={completedItems}
					current={batchProgress.currentItem}
					successCount={batchProgress.completed}
					failedCount={batchProgress.failed}
					total={batchProgress.total}
					isFinished={isFinished}
				/>
				{summary && (
					<Box marginTop={1}>
						<Text color="green">{summary}</Text>
					</Box>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget - 下载 {name} 文章</Text>
			<DownloadProgress progress={progress} />
		</Box>
	);
}
