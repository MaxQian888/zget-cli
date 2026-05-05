import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {XhsCookieStore} from '../core/auth/xhs-auth';
import {XhsApi} from '../core/api/xhs-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import InteractResult from '../components/interact-result';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {GlobalFlags} from './types';

type XhsInteractType =
	| 'xhs-like'
	| 'xhs-unlike'
	| 'xhs-favorite'
	| 'xhs-unfavorite'
	| 'xhs-comment'
	| 'xhs-delete';

type Props = {
	readonly interactType: XhsInteractType;
	readonly target: string;
	readonly text?: string;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function XhsInteractCommand({
	interactType,
	target,
	text,
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
			let xhsApi: XhsApi | undefined;
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const cookieStore = new XhsCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				xhsApi = new XhsApi(cookieStore);
				await xhsApi.init();

				switch (interactType) {
					case 'xhs-like': {
						await xhsApi.likeNote(target);
						setMessage(`已点赞笔记 ${target}`);
						break;
					}

					case 'xhs-unlike': {
						await xhsApi.unlikeNote(target);
						setMessage(`已取消点赞笔记 ${target}`);
						break;
					}

					case 'xhs-favorite': {
						await xhsApi.favoriteNote(target);
						setMessage(`已收藏笔记 ${target}`);
						break;
					}

					case 'xhs-unfavorite': {
						await xhsApi.unfavoriteNote(target);
						setMessage(`已取消收藏笔记 ${target}`);
						break;
					}

					case 'xhs-comment': {
						if (!text) throw new Error('请提供评论内容');
						await xhsApi.postComment(target, text);
						setMessage(`已评论笔记 ${target}`);
						break;
					}

					case 'xhs-delete': {
						await xhsApi.deleteNote(target);
						setMessage(`已删除笔记 ${target}`);
						break;
					}

					default: {
						throw new Error('Unsupported Xiaohongshu interact type');
					}
				}

				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{success: true, action: interactType, target},
							null,
							2,
						),
					);
				}

				setSuccess(true);
				setLoading(false);
			} catch (error_: unknown) {
				const message =
					error_ instanceof Error ? error_.message : String(error_);
				pendingExitCode = getExitCode(error_);
				const hint = getErrorHint(error_);
				setError(message);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{ok: false, error: {code: pendingExitCode, message, hint}},
							null,
							2,
						),
					);
				}

				setLoading(false);
			} finally {
				if (xhsApi) await xhsApi.close();
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
				suggestion='请运行 "zget xhs login" 登录后重试'
			/>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> 正在处理...</Text>
			</Box>
		);
	}

	return <InteractResult isSuccess={success} message={message} />;
}
