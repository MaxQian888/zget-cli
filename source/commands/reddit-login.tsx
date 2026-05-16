import process from 'node:process';
import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {
	RedditCredentialStore,
	performRedditPasswordLogin,
} from '../core/auth/reddit-auth';
import {RedditApi} from '../core/api/reddit-api';
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

type LoginMode = 'reddit-login' | 'reddit-whoami' | 'reddit-logout';

type Props = {
	readonly mode: LoginMode;
	readonly flags: GlobalFlags;
	readonly cookie?: string; // JSON blob with {clientId, clientSecret, username, password}
	readonly format?: 'human' | 'json';
};

type LoginInput = {
	clientId: string;
	clientSecret: string;
	username: string;
	password: string;
};

function parseLoginInput(rawCookie?: string): LoginInput | undefined {
	const fromEnv: LoginInput = {
		clientId: process.env.REDDIT_CLIENT_ID ?? '',
		clientSecret: process.env.REDDIT_CLIENT_SECRET ?? '',
		username: process.env.REDDIT_USERNAME ?? '',
		password: process.env.REDDIT_PASSWORD ?? '',
	};

	if (rawCookie?.trim()) {
		try {
			const parsed = JSON.parse(rawCookie) as Partial<LoginInput>;
			return {
				clientId: parsed.clientId ?? fromEnv.clientId,
				clientSecret: parsed.clientSecret ?? fromEnv.clientSecret,
				username: parsed.username ?? fromEnv.username,
				password: parsed.password ?? fromEnv.password,
			};
		} catch {
			// Fall through; treat the raw cookie as a "password" if env has the rest.
			return {...fromEnv, password: rawCookie};
		}
	}

	if (
		fromEnv.clientId &&
		fromEnv.clientSecret &&
		fromEnv.username &&
		fromEnv.password
	) {
		return fromEnv;
	}

	return undefined;
}

export default function RedditLoginCommand({
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
				const store = new RedditCredentialStore();
				await store.load();

				switch (mode) {
					case 'reddit-login': {
						const input = parseLoginInput(cookie ?? flags.cookies);
						if (!input) {
							throw new CliError(
								'Reddit 登录需要 client_id/secret + username/password。' +
									'传参方式 (任选一):\n' +
									'  1) --cookie \'{"clientId":"...","clientSecret":"...","username":"...","password":"..."}\'\n' +
									'  2) 设置环境变量 REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / REDDIT_USERNAME / REDDIT_PASSWORD',
								ExitCode.USAGE,
							);
						}

						await performRedditPasswordLogin(input);
						setMessage('Reddit Token 已保存');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify(
									{
										ok: true,
										data: {source: 'oauth-password', username: input.username},
									},
									null,
									2,
								),
							);
						}

						setStatus('success');
						break;
					}

					case 'reddit-whoami': {
						if (!store.isAuthenticated()) {
							throw new CliError(
								'未登录，请先运行 "zget reddit login"',
								ExitCode.NOPERM,
								'zget reddit login',
							);
						}

						const api = new RedditApi(store);
						const user = await api.getMyProfile();
						if (format === 'json') {
							setJsonOutput(JSON.stringify({ok: true, data: user}, null, 2));
							break;
						}

						setDetails([
							{key: '用户名', value: `u/${user.name}`},
							{key: 'ID', value: user.id},
							{key: 'Karma', value: String(user.total_karma ?? 0)},
							{key: '链接 Karma', value: String(user.link_karma ?? 0)},
							{key: '评论 Karma', value: String(user.comment_karma ?? 0)},
						]);
						setMessage('当前登录用户');
						setStatus('success');
						break;
					}

					case 'reddit-logout': {
						store.clear();
						await store.save();
						setMessage('已退出登录，凭据已清除');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify({ok: true, data: {cleared: true}}, null, 2),
							);
						}

						setStatus('success');
						break;
					}

					default: {
						throw new Error('Unsupported Reddit login mode');
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
				suggestion="请到 https://www.reddit.com/prefs/apps 创建 script app 后通过 --cookie 或 REDDIT_* 环境变量传入凭据"
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
