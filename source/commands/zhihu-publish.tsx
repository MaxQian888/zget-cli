import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {CookieStore} from '../core/auth/cookie-store';
import {ApiClient} from '../core/api/client';
import {ZhihuApi} from '../core/api/zhihu-api';
import {uploadZhihuImage} from '../core/api/zhihu-image-upload';
import type {ZhihuImageInfo, ZhihuPublishResult} from '../core/api/types';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type ZhihuPublishKind = 'zhihu-ask' | 'zhihu-pin' | 'zhihu-publish-article';

type Props = {
	readonly kind: ZhihuPublishKind;
	readonly title: string;
	readonly body?: string;
	readonly topics?: string[];
	readonly images?: string[];
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function ZhihuPublishCommand({
	kind,
	title,
	body = '',
	topics = [],
	images = [],
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [stage, setStage] = useState('准备中…');
	const [error, setError] = useState<string | undefined>();
	const [result, setResult] = useState<ZhihuPublishResult | undefined>();
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const store = new CookieStore();
				await store.load();
				if (flags.cookies) store.parseCookieString(flags.cookies);
				if (!store.isAuthenticated()) {
					throw new Error('未登录，请先运行 "zget zhihu login"');
				}

				const client = new ApiClient({cookieStore: store});
				const api = new ZhihuApi(client);

				const imageInfos: ZhihuImageInfo[] = [];
				for (let index = 0; index < images.length; index += 1) {
					const path = images[index]!;
					setStage(`上传图片 ${index + 1}/${images.length} (${path})…`);
					// eslint-disable-next-line no-await-in-loop
					const info = await uploadZhihuImage(client, path, {
						source:
							kind === 'zhihu-pin'
								? 'pin'
								: kind === 'zhihu-publish-article'
								? 'article'
								: 'article',
					});
					imageInfos.push(info);
				}

				setStage('发布中…');
				let publishResult: ZhihuPublishResult;
				switch (kind) {
					case 'zhihu-ask': {
						publishResult = await api.askQuestion(
							title,
							body,
							topics,
							imageInfos,
						);
						break;
					}

					case 'zhihu-pin': {
						publishResult = await api.createPin(title, body, imageInfos);
						break;
					}

					case 'zhihu-publish-article': {
						publishResult = await api.publishArticle(
							title,
							body,
							topics,
							imageInfos,
						);
						break;
					}

					default: {
						throw new Error(`Unsupported zhihu publish kind: ${String(kind)}`);
					}
				}

				setResult(publishResult);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify({ok: true, data: publishResult}, null, 2),
					);
				}

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
								error: {code: pendingExitCode, message: errorMessage, hint},
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
				suggestion='请运行 "zget zhihu login" 后重试'
			/>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> {stage}</Text>
			</Box>
		);
	}

	if (!result) {
		return <Text dimColor>(无结果)</Text>;
	}

	return (
		<Box flexDirection="column">
			<Text color="green">✓ 发布成功</Text>
			<Box marginLeft={2} flexDirection="column">
				<Text>类型: {result.type}</Text>
				<Text>ID: {result.id}</Text>
				{result.url ? <Text>URL: {result.url}</Text> : null}
			</Box>
		</Box>
	);
}
