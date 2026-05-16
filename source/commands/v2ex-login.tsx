import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {V2exTokenStore} from '../core/auth/v2ex-auth';
import {V2exApi} from '../core/api/v2ex-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import {
	CliError,
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {GlobalFlags} from './types';

type LoginMode = 'v2ex-login' | 'v2ex-whoami' | 'v2ex-logout';

type Props = {
	readonly mode: LoginMode;
	readonly flags: GlobalFlags;
	readonly cookie?: string; // Reused as the PAT input
	readonly format?: 'human' | 'json';
};

export default function V2exLoginCommand({
	mode,
	flags,
	cookie,
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

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const store = new V2exTokenStore();
				await store.load();

				switch (mode) {
					case 'v2ex-login': {
						// V2EX has no QR flow; users paste a Personal Access Token from
						// v2ex.com/settings/tokens via --cookie or --cookies.
						const token = cookie ?? flags.cookies;
						if (!token) {
							throw new CliError(
								'V2EX 登录需要 PAT。请到 https://www.v2ex.com/settings/tokens 创建后通过 --cookie <token> 传入',
								ExitCode.USAGE,
							);
						}

						store.setToken(token);
						await store.save();
						setMessage('Token 已保存');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify(
									{ok: true, data: {source: 'token-flag'}},
									null,
									2,
								),
							);
						}

						setStatus('success');
						break;
					}

					case 'v2ex-whoami': {
						if (!store.isAuthenticated()) {
							throw new CliError(
								'未登录，请先运行 "zget v2ex login"',
								ExitCode.NOPERM,
								'zget v2ex login',
							);
						}

						const api = new V2exApi(store);
						const member = await api.getMyMember();
						if (format === 'json') {
							setJsonOutput(JSON.stringify({ok: true, data: member}, null, 2));
							break;
						}

						setDetails([
							{key: '用户名', value: member.username},
							{key: 'ID', value: String(member.id)},
							{key: '签名', value: member.tagline ?? '-'},
							{key: '简介', value: member.bio ?? '-'},
							{key: '位置', value: member.location ?? '-'},
						]);
						setMessage('当前登录用户');
						setStatus('success');
						break;
					}

					case 'v2ex-logout': {
						store.clear();
						await store.save();
						setMessage('已退出登录，Token 已清除');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify({ok: true, data: {cleared: true}}, null, 2),
							);
						}

						setStatus('success');
						break;
					}

					default: {
						throw new Error('Unsupported V2EX login mode');
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
				}, 200);
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
				suggestion='请在 https://www.v2ex.com/settings/tokens 创建 PAT 后通过 "zget v2ex login --cookie <token>" 登录'
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
		<Box>
			<Spinner label="" />
			<Text> 正在处理...</Text>
		</Box>
	);
}
