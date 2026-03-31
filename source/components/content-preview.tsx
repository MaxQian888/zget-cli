import {Box, Text} from 'ink';
import type {DownloadResult} from '../core/downloader/types';

type Props = {
	readonly result: DownloadResult;
};

export default function ContentPreview({result}: Props) {
	if (!result.success) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color="red">✗ 下载失败</Text>
				{result.error && (
					<Text dimColor color="red">
						{'  '}
						{result.error}
					</Text>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text bold color="green">
				✓ 下载完成
			</Text>
			<Box marginLeft={2} flexDirection="column">
				<Text>
					<Text bold>标题: </Text>
					{result.title}
				</Text>
				<Text>
					<Text bold>作者: </Text>
					{result.author}
				</Text>
				{result.imageCount > 0 && (
					<Text>
						<Text bold>图片: </Text>
						{result.imageCount} 张
					</Text>
				)}
				<Text>
					<Text bold>保存: </Text>
					<Text color="cyan">{result.outputPath}</Text>
				</Text>
			</Box>
		</Box>
	);
}
