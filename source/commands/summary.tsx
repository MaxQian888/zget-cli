import {Box, Text} from 'ink';
import {useState, useEffect} from 'react';
import {Spinner} from '@inkjs/ui';
import {AiConfigStore} from '../core/ai/ai-config';
import {summarize} from '../core/ai/summarizer';
import {extractContentForSummary} from '../core/ai/content-extractor';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly url: string;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function SummaryCommand({url, flags, format = 'human'}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [phase, setPhase] = useState('初始化...');
	const [error, setError] = useState<string | undefined>();
	const [summaryText, setSummaryText] = useState('');
	const [keyPoints, setKeyPoints] = useState<string[]>([]);
	const [meta, setMeta] = useState<{
		model: string;
		platform: string;
		title: string;
	}>({model: '', platform: '', title: ''});
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useEffect(() => {
		const run = async () => {
			try {
				// Step 1: Load AI config
				setPhase('加载 AI 配置...');
				const configStore = new AiConfigStore();
				await configStore.load();

				if (!configStore.isConfigured()) {
					throw new Error(
						'AI 未配置。请设置环境变量:\n\n' +
							'  OpenAI:     export OPENAI_API_KEY=sk-xxx\n' +
							'  Anthropic:  export ANTHROPIC_API_KEY=sk-ant-xxx\n' +
							'  DeepSeek:   export DEEPSEEK_API_KEY=xxx\n\n' +
							'或创建配置文件: ~/.zget-cli/ai-config.json',
					);
				}

				const config = configStore.getConfig()!;

				// Step 2: Extract content
				setPhase('正在提取内容...');
				const content = await extractContentForSummary(url, flags);

				// Step 3: Summarize
				setPhase(`正在生成摘要 (${config.provider})...`);
				const result = await summarize(
					{
						content: content.text,
						title: content.title,
						platform: content.platform,
						contentType: content.contentType,
					},
					config,
				);

				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								url,
								platform: content.platform,
								title: content.title,
								contentType: content.contentType,
								summary: result.summary,
								keyPoints: result.keyPoints,
								model: result.model,
								tokensUsed: result.tokensUsed,
							},
							null,
							2,
						),
					);
				} else {
					setSummaryText(result.summary);
					setKeyPoints(result.keyPoints ?? []);
					setMeta({
						model: result.model,
						platform: content.platform,
						title: content.title ?? '',
					});
				}

				setLoading(false);
			} catch (error_: unknown) {
				setError(error_ instanceof Error ? error_.message : String(error_));
				setLoading(false);
			} finally {
				setTimeout(() => {
					exit();
				}, 100);
			}
		};

		void run();
	}, []);

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion="请检查 URL 和 AI 配置是否正确"
			/>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> {phase}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{meta.title && (
				<Text bold color="cyan">
					{meta.title}
				</Text>
			)}
			<Text dimColor>
				来源: {meta.platform} | 模型: {meta.model}
			</Text>
			<Text> </Text>

			<Text bold>摘要</Text>
			<Text>{summaryText}</Text>

			{keyPoints.length > 0 && (
				<>
					<Text> </Text>
					<Text bold>要点</Text>
					{keyPoints.map(point => (
						<Text key={point}> • {point}</Text>
					))}
				</>
			)}
		</Box>
	);
}
