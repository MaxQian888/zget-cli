import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {BiliCookieStore, performBiliQrLogin} from '../core/auth/bili-auth';
import {BiliApi} from '../core/api/bili-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type LoginMode = 'bili-login' | 'bili-whoami' | 'bili-logout';

type Props = {
	readonly mode: LoginMode;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function BiliLoginCommand({
	mode,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading',
	);
	const [message, setMessage] = useState('');
	const [details, setDetails] = useState<Array<{key: string; value: string}>>(
		[],
	);
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();
	const [qrUrl, setQrUrl] = useState<string | undefined>();
	const [scanStatus, setScanStatus] = useState<string>('');

	useRunOnceEffect(() => {
		const run = async () => {
			try {
				const cookieStore = new BiliCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				switch (mode) {
					case 'bili-login': {
						if (flags.cookies) {
							// Manual cookie mode
							cookieStore.parseCookieString(flags.cookies);
							await cookieStore.save();
							setMessage('Cookie 已保存');
							setStatus('success');
							break;
						}

						// QR code login
						setMessage('正在获取二维码...');
						await performBiliQrLogin({
							onQrReady(url) {
								setQrUrl(url);
								setMessage('请使用 Bilibili 客户端扫描二维码:');
							},
							onStatusChange(qrStatus, message_) {
								switch (qrStatus) {
									case 'waiting': {
										setScanStatus('等待扫码...');
										break;
									}

									case 'scanned': {
										setScanStatus('已扫码，请在手机上确认...');
										break;
									}

									case 'confirmed': {
										setMessage('登录成功！Cookie 已保存');
										setStatus('success');
										break;
									}

									case 'expired': {
										setMessage(message_ ?? '二维码已过期，请重新登录');
										setStatus('error');
										break;
									}

									case 'error': {
										setMessage(message_ ?? '登录失败');
										setStatus('error');
										break;
									}

									default: {
										setScanStatus(message_ ?? '状态未知');
										break;
									}
								}
							},
						});
						break;
					}

					case 'bili-whoami': {
						if (!cookieStore.isAuthenticated()) {
							throw new Error('未登录，请先运行 "zget bili login"');
						}

						const api = new BiliApi(cookieStore);
						const user = await api.getMyInfo();
						if (format === 'json') {
							setJsonOutput(JSON.stringify(user, null, 2));
							break;
						}

						setDetails([
							{key: '昵称', value: user.name},
							{key: 'UID', value: String(user.mid)},
							{key: '签名', value: user.sign || '-'},
						]);
						setMessage('当前登录用户');
						setStatus('success');
						break;
					}

					case 'bili-logout': {
						cookieStore.clear();
						await cookieStore.save();
						setMessage('已退出登录，Cookie 已清除');
						setStatus('success');
						break;
					}

					default: {
						throw new Error('Unsupported Bilibili login mode');
					}
				}
			} catch (error: unknown) {
				setStatus('error');
				setMessage(error instanceof Error ? error.message : String(error));
			} finally {
				setTimeout(() => {
					exit();
				}, 500);
			}
		};

		void run();
	});

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (status === 'error') {
		return (
			<ErrorDisplay
				message={message}
				suggestion='请重新运行 "zget bili login" 或使用 --cookies 手动传入'
			/>
		);
	}

	if (status === 'success') {
		return (
			<Box flexDirection="column">
				<Text bold color="green">
					✓ {message}
				</Text>
				{details.map(d => (
					<Box key={d.key} marginLeft={2}>
						<Text bold>{d.key}: </Text>
						<Text>{d.value}</Text>
					</Box>
				))}
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box>
				<Spinner label="" />
				<Text> {message || '正在处理...'}</Text>
			</Box>
			{qrUrl && (
				<Box flexDirection="column" marginTop={1}>
					<Text color="yellow">{qrUrl}</Text>
					<Text dimColor>
						（复制上方链接到浏览器打开，或在终端中用二维码工具扫描）
					</Text>
					{scanStatus && <Text color="cyan">{scanStatus}</Text>}
				</Box>
			)}
		</Box>
	);
}
