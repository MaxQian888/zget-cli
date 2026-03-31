import {Box, Text, useApp, useInput} from 'ink';
import {useState} from 'react';
import {defaultName} from './cli-metadata.js';

type Props = {
	readonly name?: string;
	readonly isInteractive?: boolean;
	readonly onExit?: () => void;
};

export default function App(props: Props) {
	const {name = defaultName, isInteractive = false, onExit} = props;
	const [displayName, setDisplayName] = useState(name);
	const [hasEditedName, setHasEditedName] = useState(name !== defaultName);
	const {exit} = useApp();

	useInput((input, key) => {
		if (!isInteractive) {
			return;
		}

		if (key.escape || input === 'r') {
			setDisplayName(defaultName);
			setHasEditedName(false);
			return;
		}

		if (input === 'q') {
			onExit?.();
			exit();
			return;
		}

		if (key.backspace || key.delete) {
			setDisplayName(currentName =>
				currentName.slice(0, Math.max(0, currentName.length - 1)),
			);
			setHasEditedName(true);
			return;
		}

		if (
			key.return ||
			key.tab ||
			key.escape ||
			key.upArrow ||
			key.downArrow ||
			key.leftArrow ||
			key.rightArrow
		) {
			return;
		}

		if (key.ctrl || key.meta || input.length === 0) {
			return;
		}

		setDisplayName(currentName =>
			hasEditedName ? `${currentName}${input}` : input,
		);
		setHasEditedName(true);
	});

	if (!isInteractive) {
		return <Text>Hello, {displayName}</Text>;
	}

	return (
		<Box flexDirection="column">
			<Text>Hello, {displayName}</Text>
			<Text dimColor>
				Type text to update the name. Press r or Esc to reset. Press q to quit.
			</Text>
		</Box>
	);
}
