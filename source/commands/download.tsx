import {Box, Text} from 'ink';
import {useState} from 'react';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {ApiClient} from '../core/api/client';
import {ZhihuApi} from '../core/api/zhihu-api';
import {CookieStore} from '../core/auth/cookie-store';
import {downloadArticle} from '../core/downloader/article-downloader';
import {downloadAnswer} from '../core/downloader/answer-downloader';
import {downloadVideo} from '../core/downloader/video-downloader';
import {parseZhihuUrl} from '../core/utils/url-parser';
import type {
	DownloadProgress as ProgressType,
	DownloadResult,
} from '../core/downloader/types';
import DownloadProgress from '../components/download-progress';
import ContentPreview from '../components/content-preview';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly type: 'article' | 'answer' | 'video';
	readonly url: string;
	readonly flags: GlobalFlags;
};

export default function DownloadCommand({type, url, flags}: Props) {
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
				const cookieStore = new CookieStore();
				await cookieStore.load();

				if (flags.cookies) {
					cookieStore.parseCookieString(flags.cookies);
				}

				const client = new ApiClient({cookieStore});
				const api = new ZhihuApi(client);

				const options = {
					outputDir: flags.output,
					downloadImages: flags.images,
					verbose: flags.verbose,
					onProgress: setProgress,
				};

				let downloadResult: DownloadResult;

				if (type === 'article') {
					const parsed = parseZhihuUrl(url);
					const articleId =
						parsed.platform === 'zhihu' && parsed.type === 'article'
							? parsed.articleId
							: url;
					downloadResult = await downloadArticle(articleId, api, options);
				} else if (type === 'answer') {
					const parsed = parseZhihuUrl(url);
					if (!(parsed.platform === 'zhihu' && parsed.type === 'answer')) {
						throw new Error('无效的回答链接');
					}

					downloadResult = await downloadAnswer(
						parsed.questionId,
						parsed.answerId,
						api,
						options,
					);
				} else {
					const parsed = parseZhihuUrl(url);
					const videoId =
						parsed.platform === 'zhihu' && parsed.type === 'video'
							? parsed.videoId
							: url;
					downloadResult = await downloadVideo(videoId, api, client, options);
				}

				setResult(downloadResult);
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
				suggestion="请检查链接是否正确，或运行 zget login 登录后重试"
			/>
		);
	}

	if (result) {
		return <ContentPreview result={result} />;
	}

	return (
		<Box flexDirection="column">
			<Text bold>
				zget - 下载知乎
				{type === 'article' ? '文章' : type === 'answer' ? '回答' : '视频'}
			</Text>
			<DownloadProgress progress={progress} />
		</Box>
	);
}
