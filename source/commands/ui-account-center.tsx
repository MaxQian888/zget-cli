import {Box, Text, useInput} from 'ink';
import {useEffect, useState} from 'react';
import type {
	AccountPlatform,
	AccountStateSnapshot,
} from '../core/account/types';
import {getAccountOverview} from '../core/account/account-status';
import StatusLine from '../components/status-line';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly flags: GlobalFlags;
	readonly onSelectPlatform?: (platform: AccountPlatform) => void;
	readonly onBack?: () => void;
};

function buildPlatformSummary(item: AccountStateSnapshot): string {
	const parts = [
		`${item.platform} [${item.status}] (${item.credentialSource})`,
	];

	if (item.identity?.displayName) {
		parts.push(item.identity.displayName);
	}

	if (item.identity?.handle) {
		parts.push(item.identity.handle);
	}

	if (item.lastValidatedAt) {
		parts.push(item.lastValidatedAt);
	}

	if (item.latestError) {
		parts.push(item.latestError);
	}

	return parts.join(' · ');
}

export default function UiAccountCenterCommand({
	flags: _flags,
	onSelectPlatform,
	onBack,
}: Props) {
	const [items, setItems] = useState<AccountStateSnapshot[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		const load = async () => {
			try {
				setIsLoading(true);
				setError(undefined);
				const overview = await getAccountOverview();
				setItems(overview);
			} catch (error_: unknown) {
				setError(error_ instanceof Error ? error_.message : String(error_));
			} finally {
				setIsLoading(false);
			}
		};

		void load();
	}, []);

	// `useInput` is currently typed too loosely in this stack.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	useInput((input, key) => {
		if (key.escape || input === 'q') {
			onBack?.();
			return;
		}

		if (isLoading || error !== undefined || items.length === 0) {
			return;
		}

		if (key.downArrow || input === 'j') {
			setSelectedIndex(current => Math.min(current + 1, items.length - 1));
			return;
		}

		if (key.upArrow || input === 'k') {
			setSelectedIndex(current => Math.max(current - 1, 0));
			return;
		}

		if (key.return || input === '\r') {
			onSelectPlatform?.(items[selectedIndex]!.platform);
		}
	});

	if (isLoading) {
		return <StatusLine message="Loading account overview..." />;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion="Retry the account overview load or return to the home screen."
			/>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold>Account Center</Text>
			<Text dimColor>Use ↑/↓ or j/k, then press Enter.</Text>
			<Box flexDirection="column" marginTop={1}>
				{items.map((item, index) => (
					<Text
						key={item.platform}
						color={index === selectedIndex ? 'green' : undefined}
					>
						{index === selectedIndex ? '›' : ' '} {buildPlatformSummary(item)}
					</Text>
				))}
			</Box>
		</Box>
	);
}
