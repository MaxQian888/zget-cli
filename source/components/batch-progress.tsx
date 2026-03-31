import {Box, Text, Static} from 'ink';
import {Spinner} from '@inkjs/ui';

type CompletedItem = {
	id: string;
	title: string;
	success: boolean;
};

type Props = {
	readonly completed: CompletedItem[];
	readonly current?: string;
	readonly successCount: number;
	readonly failedCount: number;
	readonly total: number;
	readonly isFinished: boolean;
};

export default function BatchProgress({
	completed,
	current,
	successCount,
	failedCount,
	total,
	isFinished,
}: Props) {
	return (
		<Box flexDirection="column">
			<Static items={completed}>
				{(item: CompletedItem) => (
					<Text key={item.id}>
						<Text color={item.success ? 'green' : 'red'}>
							{item.success ? '  ✓' : '  ✗'}
						</Text>{' '}
						{item.title}
					</Text>
				)}
			</Static>

			{!isFinished && current && (
				<Box>
					<Spinner label="" />
					<Text> {current}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text bold>
					进度: {successCount + failedCount}
					{total > 0 ? `/${total}` : ''}
				</Text>
				<Text color="green"> 成功 {successCount}</Text>
				{failedCount > 0 && <Text color="red"> 失败 {failedCount}</Text>}
			</Box>

			{isFinished && (
				<Box marginTop={1}>
					<Text bold color="green">
						✓ 批量下载完成
					</Text>
				</Box>
			)}
		</Box>
	);
}
