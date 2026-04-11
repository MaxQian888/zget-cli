import {Box, Text, useInput} from 'ink';
import {useEffect, useMemo, useState} from 'react';
import {getPlatformAccountState} from '../core/account/account-status';
import {runPlatformAction} from '../core/account/platform-actions';
import type {
	AccountAction,
	AccountPlatform,
	AccountStateSnapshot,
} from '../core/account/types';
import StatusLine from '../components/status-line';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly url?: string;
	readonly platform?: AccountPlatform;
	readonly flags: GlobalFlags;
	readonly onBack?: () => void;
};

const actions: AccountAction[] = ['recheck', 'clear', 'login'];

function assertNever(value: never): never {
	throw new Error(`Unsupported value: ${String(value)}`);
}

function toPlatformKey(
	url?: string,
	platform?: AccountPlatform,
): AccountPlatform {
	if (platform !== undefined) {
		return platform;
	}

	if (
		url === 'zhihu' ||
		url === 'x' ||
		url === 'xhs' ||
		url === 'bili' ||
		url === 'ai'
	) {
		return url;
	}

	return 'zhihu';
}

function formatAction(action: AccountAction): string {
	switch (action) {
		case 'recheck': {
			return 'Recheck';
		}

		case 'clear': {
			return 'Clear';
		}

		case 'login': {
			return 'Login';
		}

		default: {
			return assertNever(action);
		}
	}
}

export default function UiAccountPlatformCommand({
	url,
	platform,
	flags: _flags,
	onBack,
}: Props) {
	const platformKey = useMemo(
		() => toPlatformKey(url, platform),
		[platform, url],
	);
	const [snapshot, setSnapshot] = useState<AccountStateSnapshot | undefined>();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [selectedAction, setSelectedAction] = useState(0);
	const [lastActionMessage, setLastActionMessage] = useState<
		string | undefined
	>();

	useEffect(() => {
		const load = async () => {
			try {
				setIsLoading(true);
				setError(undefined);
				setSnapshot(await getPlatformAccountState(platformKey));
			} catch (error_: unknown) {
				setError(error_ instanceof Error ? error_.message : String(error_));
			} finally {
				setIsLoading(false);
			}
		};

		void load();
	}, [platformKey]);

	// `useInput` is currently typed too loosely in this stack.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	useInput((input, key) => {
		if (key.escape || input === 'q') {
			onBack?.();
			return;
		}

		if (isLoading || error) {
			return;
		}

		if (key.downArrow || input === 'j') {
			setSelectedAction(current => Math.min(current + 1, actions.length - 1));
			return;
		}

		if (key.upArrow || input === 'k') {
			setSelectedAction(current => Math.max(current - 1, 0));
			return;
		}

		if (key.return || input === '\r') {
			void (async () => {
				const result = await runPlatformAction(
					platformKey,
					actions[selectedAction]!,
				);
				setLastActionMessage(result.message);
				if (result.state) {
					setSnapshot(result.state);
				}
			})();
		}
	});

	if (isLoading || snapshot === undefined) {
		return <StatusLine message={`Loading ${platformKey} account details...`} />;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion="Retry the platform detail load or return to the account center."
			/>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold>Platform: {platformKey}</Text>
			<Text>Status: {snapshot.status}</Text>
			<Text>Credential source: {snapshot.credentialSource}</Text>
			{snapshot.identity?.displayName && (
				<Text>Display name: {snapshot.identity.displayName}</Text>
			)}
			{snapshot.identity?.handle && (
				<Text>Handle: {snapshot.identity.handle}</Text>
			)}
			{snapshot.lastValidatedAt && (
				<Text>Last checked: {snapshot.lastValidatedAt}</Text>
			)}
			{snapshot.latestError && (
				<Text>Latest error: {snapshot.latestError}</Text>
			)}
			{lastActionMessage && <Text>Last action: {lastActionMessage}</Text>}

			<Box flexDirection="column" marginTop={1}>
				<Text bold>Actions</Text>
				{actions.map((action, index) => (
					<Text
						key={action}
						color={index === selectedAction ? 'green' : undefined}
					>
						{index === selectedAction ? '›' : ' '} {formatAction(action)}
					</Text>
				))}
			</Box>
		</Box>
	);
}
