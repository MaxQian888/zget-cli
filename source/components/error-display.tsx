import {Box, Text} from 'ink';

type Props = {
	readonly message: string;
	readonly suggestion?: string;
};

export default function ErrorDisplay({message, suggestion}: Props) {
	return (
		<Box flexDirection="column" marginTop={1}>
			<Text bold color="red">
				✗ 错误
			</Text>
			<Box marginLeft={2}>
				<Text color="red">{message}</Text>
			</Box>
			{suggestion && (
				<Box marginLeft={2} marginTop={1}>
					<Text dimColor>提示: {suggestion}</Text>
				</Box>
			)}
		</Box>
	);
}
