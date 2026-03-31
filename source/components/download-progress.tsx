import {Box, Text} from 'ink';
import {Spinner} from '@inkjs/ui';
import type {DownloadProgress as ProgressType} from '../core/downloader/types';

type Props = {
	readonly progress: ProgressType;
};

const phaseIcons: Record<string, string> = {
	fetching: '↓',
	parsing: '⚙',
	images: '🖼',
	writing: '✎',
	done: '✓',
	error: '✗',
};

export default function DownloadProgress({progress}: Props) {
	const icon = phaseIcons[progress.phase] ?? '·';
	const isDone = progress.phase === 'done';
	const isError = progress.phase === 'error';

	return (
		<Box>
			{!isDone && !isError && <Spinner label="" />}
			<Text color={isDone ? 'green' : isError ? 'red' : 'cyan'}>
				{' '}
				{icon} {progress.message}
			</Text>
			{progress.total !== undefined && progress.current !== undefined && (
				<Text dimColor>
					{' '}
					({progress.current}/{progress.total})
				</Text>
			)}
		</Box>
	);
}
