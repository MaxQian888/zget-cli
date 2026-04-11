import {Box, Text, useInput} from 'ink';
import {useState} from 'react';
import type {AccountPlatform} from '../core/account/types';
import UiAccountCenterCommand from './ui-account-center';
import UiAccountPlatformCommand from './ui-account-platform';
import type {GlobalFlags} from './types';

type Props = {
	readonly flags: GlobalFlags;
};

const actionItems = [
	'Download',
	'Browse',
	'Account Center',
	'Summary',
] as const;
const platformItems = ['Zhihu', 'X', 'XHS', 'Bilibili', 'AI'] as const;

export default function UiHomeCommand({flags}: Props) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [screen, setScreen] = useState<
		'home' | 'account-center' | 'account-platform'
	>('home');
	const [selectedPlatform, setSelectedPlatform] =
		useState<AccountPlatform>('zhihu');

	// `useInput` is currently typed too loosely in this stack.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	useInput((input, key) => {
		if (screen !== 'home') {
			if (key.escape || input === 'q') {
				setScreen('home');
			}

			return;
		}

		if (key.downArrow || input === 'j') {
			setSelectedIndex(current =>
				Math.min(current + 1, actionItems.length - 1),
			);
			return;
		}

		if (key.upArrow || input === 'k') {
			setSelectedIndex(current => Math.max(current - 1, 0));
			return;
		}

		if (
			(key.return || input === '\r') &&
			actionItems[selectedIndex] === 'Account Center'
		) {
			setScreen('account-center');
		}
	});

	if (screen === 'account-center') {
		return (
			<UiAccountCenterCommand
				flags={flags}
				onBack={() => {
					setScreen('home');
				}}
				onSelectPlatform={platform => {
					setSelectedPlatform(platform);
					setScreen('account-platform');
				}}
			/>
		);
	}

	if (screen === 'account-platform') {
		return (
			<UiAccountPlatformCommand
				flags={flags}
				platform={selectedPlatform}
				onBack={() => {
					setScreen('account-center');
				}}
			/>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold>zget Interactive Home</Text>
			<Text dimColor>Use ↑/↓ or j/k, then press Enter.</Text>

			<Box flexDirection="column" marginTop={1}>
				<Text bold>Common actions</Text>
				{actionItems.map((item, index) => (
					<Text
						key={item}
						color={index === selectedIndex ? 'green' : undefined}
					>
						{index === selectedIndex ? '›' : ' '} {item}
					</Text>
				))}
			</Box>

			<Box flexDirection="column" marginTop={1}>
				<Text bold>Platforms</Text>
				<Text>{platformItems.join(' · ')}</Text>
			</Box>
		</Box>
	);
}
