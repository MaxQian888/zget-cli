import {Box, Text} from 'ink';
import {Spinner} from '@inkjs/ui';

type Props = {
	readonly message: string;
	readonly isLoading?: boolean;
};

export default function StatusLine({message, isLoading = true}: Props) {
	return (
		<Box>
			{isLoading && <Spinner label="" />}
			<Text> {message}</Text>
		</Box>
	);
}
