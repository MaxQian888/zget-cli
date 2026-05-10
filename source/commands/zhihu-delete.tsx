import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {CookieStore} from '../core/auth/cookie-store';
import {ApiClient} from '../core/api/client';
import {ZhihuApi} from '../core/api/zhihu-api';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import ErrorDisplay from '../components/error-display';
import InteractResult from '../components/interact-result';
import type {GlobalFlags} from './types';

type ZhihuDeleteKind =
	| 'zhihu-delete-question'
	| 'zhihu-delete-pin'
	| 'zhihu-delete-article';

type Props = {
	readonly kind: ZhihuDeleteKind;
	readonly target: string;
	readonly isConfirmed?: boolean;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

const labelByKind: Record<ZhihuDeleteKind, string> = {
	'zhihu-delete-question': '问题',
	'zhihu-delete-pin': '想法',
	'zhihu-delete-article': '文章',
};

export default function ZhihuDeleteCommand({
	kind,
	target,
	isConfirmed = false,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [success, setSuccess] = useState(false);
	const [message, setMessage] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				if (!isConfirmed && format !== 'json') {
					throw new Error(`删除${labelByKind[kind]}是不可逆操作，请加 -y 确认`);
				}

				const store = new CookieStore();
				await store.load();
				if (flags.cookies) store.parseCookieString(flags.cookies);
				if (!store.isAuthenticated()) {
					throw new Error('未登录，请先运行 "zget zhihu login"');
				}

				const api = new ZhihuApi(new ApiClient({cookieStore: store}));
				switch (kind) {
					case 'zhihu-delete-question': {
						await api.deleteQuestion(target);
						break;
					}

					case 'zhihu-delete-pin': {
						await api.deletePin(target);
						break;
					}

					case 'zhihu-delete-article': {
						await api.deleteArticle(target);
						break;
					}

					default: {
						throw new Error(`Unsupported zhihu delete kind: ${String(kind)}`);
					}
				}

				setMessage(`已删除${labelByKind[kind]} ${target}`);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify({ok: true, data: {action: kind, target}}, null, 2),
					);
				}

				setSuccess(true);
				setLoading(false);
			} catch (error_: unknown) {
				const errorMessage =
					error_ instanceof Error ? error_.message : String(error_);
				pendingExitCode = getExitCode(error_);
				const hint = getErrorHint(error_);
				setError(errorMessage);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: false,
								error: {code: pendingExitCode, message: errorMessage, hint},
							},
							null,
							2,
						),
					);
				}

				setLoading(false);
			} finally {
				setTimeout(() => {
					exit(pendingExitCode);
				}, 100);
			}
		};

		void run();
	});

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion="加 -y 跳过确认；或先运行 zhihu login"
			/>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> 正在删除...</Text>
			</Box>
		);
	}

	return <InteractResult isSuccess={success} message={message} />;
}
