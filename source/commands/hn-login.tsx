import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {HnCookieStore} from '../core/auth/hn-auth';
import {performHnBrowserLogin} from '../core/api/hn-browser';
import {HnApi} from '../core/api/hn-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {GlobalFlags} from './types';

type LoginMode = 'hn-login' | 'hn-whoami' | 'hn-logout';

type Props = {
	readonly mode: LoginMode;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function HnLoginCommand({mode, flags, format = 'human'}: Props) {
	const {exit} = useInkApp();
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading',
	);
	const [message, setMessage] = useState('');
	const [details, setDetails] = useState<Array<{key: string; value: string}>>(
		[],
	);
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();
	const [loginUrl, setLoginUrl] = useState<string | undefined>();
	const [scanStatus, setScanStatus] = useState<string>('');

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const cookieStore = new HnCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				switch (mode) {
					case 'hn-login': {
						if (flags.cookies) {
							await cookieStore.save();
							setMessage('Cookie 已保存');
							if (format === 'json') {
								setJsonOutput(
									JSON.stringify(
										{ok: true, data: {source: 'cookies-flag'}},
										null,
										2,
									),
								);
							}

							setStatus('success');
							break;
						}

						setMessage('正在打开 Hacker News 登录页面...');
						await performHnBrowserLogin({
							onReady(url) {
								setLoginUrl(url);
								setMessage('请在弹出的浏览器中完成登录:');
							},
							onStatusChange(s, m) {
								switch (s) {
									case 'waiting': {
										setScanStatus('等待登录完成...');
										break;
									}

									case 'captured': {
										setMessage('登录成功！Cookie 已保存');
										if (format === 'json') {
											setJsonOutput(
												JSON.stringify(
													{ok: true, data: {source: 'browser'}},
													null,
													2,
												),
											);
										}

										setStatus('success');
										break;
									}

									case 'timeout': {
										setMessage(m ?? '登录超时');
										setStatus('error');
										break;
									}

									case 'error': {
										setMessage(m ?? '登录失败');
										setStatus('error');
										break;
									}

									default: {
										break;
									}
								}
							},
						});
						break;
					}

					case 'hn-whoami': {
						if (!cookieStore.isAuthenticated()) {
							throw new Error('未登录，请先运行 "zget hn login"');
						}

						const api = new HnApi(cookieStore);
						const user = await api.getMyProfile();
						if (format === 'json') {
							setJsonOutput(JSON.stringify({ok: true, data: user}, null, 2));
							break;
						}

						setDetails([
							{key: '用户名', value: user.id},
							{key: 'Karma', value: String(user.karma ?? 0)},
							{
								key: '注册时间',
								value: user.created
									? new Date(user.created * 1000).toISOString()
									: '-',
							},
							{key: '提交数', value: String(user.submitted?.length ?? 0)},
						]);
						setMessage('当前登录用户');
						setStatus('success');
						break;
					}

					case 'hn-logout': {
						cookieStore.clear();
						await cookieStore.save();
						setMessage('已退出登录，Cookie 已清除');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify({ok: true, data: {cleared: true}}, null, 2),
							);
						}

						setStatus('success');
						break;
					}

					default: {
						throw new Error('Unsupported HN login mode');
					}
				}
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				pendingExitCode = getExitCode(error);
				const hint = getErrorHint(error);
				setStatus('error');
				setMessage(errorMessage);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: false,
								error: {
									code: pendingExitCode,
									message: errorMessage,
									hint,
								},
							},
							null,
							2,
						),
					);
				}
			} finally {
				setTimeout(() => {
					exit(pendingExitCode);
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
				suggestion='请重新运行 "zget hn login" 或使用 --cookies "user=..." 手动传入'
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
			{loginUrl && (
				<Box flexDirection="column" marginTop={1}>
					<Text color="yellow">{loginUrl}</Text>
					<Text dimColor>（在浏览器中完成登录后会自动捕获 cookie）</Text>
					{scanStatus && <Text color="cyan">{scanStatus}</Text>}
				</Box>
			)}
		</Box>
	);
}
