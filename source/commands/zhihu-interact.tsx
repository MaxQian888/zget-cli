import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {CookieStore} from '../core/auth/cookie-store';
import {ApiClient} from '../core/api/client';
import {ZhihuApi} from '../core/api/zhihu-api';
import type {ZhihuCommentTarget, ZhihuFollowTarget} from '../core/api/types';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import ErrorDisplay from '../components/error-display';
import InteractResult from '../components/interact-result';
import type {GlobalFlags} from './types';

type ZhihuInteractKind =
	| 'zhihu-vote'
	| 'zhihu-follow'
	| 'zhihu-unfollow'
	| 'zhihu-comment'
	| 'zhihu-uncomment';

type Props = {
	readonly kind: ZhihuInteractKind;
	readonly target: string;
	readonly followTarget?: ZhihuFollowTarget;
	readonly commentTarget?: ZhihuCommentTarget;
	readonly text?: string;
	readonly reply?: string;
	readonly isNeutral?: boolean;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function ZhihuInteractCommand({
	kind,
	target,
	followTarget = 'user',
	commentTarget = 'answer',
	text,
	reply,
	isNeutral = false,
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
				const store = new CookieStore();
				await store.load();
				if (flags.cookies) store.parseCookieString(flags.cookies);
				if (!store.isAuthenticated()) {
					throw new Error('未登录，请先运行 "zget zhihu login"');
				}

				const api = new ZhihuApi(new ApiClient({cookieStore: store}));
				let resultData: Record<string, unknown> = {action: kind, target};

				switch (kind) {
					case 'zhihu-vote': {
						const voteType = isNeutral ? 'neutral' : 'up';
						await api.voteAnswer(target, voteType);
						setMessage(
							isNeutral
								? `已取消对回答 ${target} 的赞同`
								: `已赞同回答 ${target}`,
						);
						resultData = {...resultData, voteType};
						break;
					}

					case 'zhihu-follow': {
						await api.follow(followTarget, target);
						setMessage(`已关注 ${followTarget} ${target}`);
						resultData = {...resultData, followTarget};
						break;
					}

					case 'zhihu-unfollow': {
						await api.unfollow(followTarget, target);
						setMessage(`已取消关注 ${followTarget} ${target}`);
						resultData = {...resultData, followTarget};
						break;
					}

					case 'zhihu-comment': {
						if (!text) throw new Error('请提供评论内容（-t "<text>"）');
						const created = await api.createComment(
							commentTarget,
							target,
							text,
							reply,
						);
						setMessage(
							`已对 ${commentTarget} ${target} 发表评论 (id: ${created.id})`,
						);
						resultData = {
							...resultData,
							commentTarget,
							commentId: created.id,
						};
						break;
					}

					case 'zhihu-uncomment': {
						await api.deleteComment(target);
						setMessage(`已删除评论 ${target}`);
						break;
					}

					default: {
						throw new Error(`Unsupported zhihu interact kind: ${String(kind)}`);
					}
				}

				if (format === 'json') {
					setJsonOutput(JSON.stringify({ok: true, data: resultData}, null, 2));
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
				suggestion='请运行 "zget zhihu login" 后重试'
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
