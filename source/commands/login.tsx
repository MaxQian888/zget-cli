import {Box, Text} from 'ink';
import {useState} from 'react';
import QRCode from 'qrcode';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {performQrLogin} from '../core/auth/qr-login';
import {useInkApp} from '../core/utils/ink-app';
import QrCodeStatus from '../components/qr-code';
import type {GlobalFlags} from './types';

type QrStatus =
	| 'loading'
	| 'waiting'
	| 'scanned'
	| 'confirmed'
	| 'expired'
	| 'error';

type Props = {
	readonly flags: GlobalFlags;
};

export default function LoginCommand({flags: _flags}: Props) {
	const {exit} = useInkApp();
	const [status, setStatus] = useState<QrStatus>('loading');
	const [qrDisplay, setQrDisplay] = useState<string>('');
	const [qrLink, setQrLink] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>('');

	useRunOnceEffect(() => {
		const run = async () => {
			try {
				await performQrLogin({
					async onQrReady(link) {
						setQrLink(link);
						try {
							const qrString = await QRCode.toString(link, {
								type: 'terminal',
								small: true,
							});
							setQrDisplay(qrString);
						} catch {
							// Will show link as fallback
						}
					},
					onStatusChange(newStatus, message) {
						setStatus(newStatus);
						if (message) setErrorMessage(message);
					},
				});
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				setStatus('error');
				setErrorMessage(message);
			} finally {
				setTimeout(() => {
					exit();
				}, 500);
			}
		};

		void run();
	});

	return (
		<Box flexDirection="column">
			<Text bold>zget - 知乎登录</Text>
			{qrDisplay && (
				<Box marginTop={1}>
					<Text>{qrDisplay}</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<QrCodeStatus status={status} />
			</Box>
			{qrLink && status === 'waiting' && (
				<Box marginTop={1}>
					<Text dimColor>若终端无法显示二维码，请手机浏览器打开: {qrLink}</Text>
				</Box>
			)}
			{errorMessage && status === 'error' && (
				<Box marginTop={1}>
					<Text color="red">{errorMessage}</Text>
				</Box>
			)}
		</Box>
	);
}
