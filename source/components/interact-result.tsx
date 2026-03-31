import {Box, Text} from 'ink';

type Props = {
	readonly isSuccess: boolean;
	readonly message: string;
};

export default function InteractResult({isSuccess, message}: Props) {
	return (
		<Box flexDirection="column" marginTop={1}>
			<Text bold color={isSuccess ? 'green' : 'red'}>
				{isSuccess ? '✓' : '✗'} {message}
			</Text>
		</Box>
	);
}
