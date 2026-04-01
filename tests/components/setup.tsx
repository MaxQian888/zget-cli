import {Text} from 'ink';
import {vi} from 'vitest';

vi.mock('@inkjs/ui', () => ({
	Spinner({label = ''}: {readonly label?: string}) {
		return <Text>{label ? `[spinner] ${label}` : '[spinner]'}</Text>;
	},
}));
