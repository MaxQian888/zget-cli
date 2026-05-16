import {Box, Text} from 'ink';
import type {ResolvedCommand} from './commands/types';
import DownloadCommand from './commands/download';
import ColumnCommand from './commands/column';
import UserCommand from './commands/user';
import LoginCommand from './commands/login';
import BrowseCommand from './commands/browse';
import PlatformDownloadCommand from './commands/platform-download';
import XBrowseCommand from './commands/x-browse';
import XInteractCommand from './commands/x-interact';
import XDownloadCommand from './commands/x-download';
import XLoginCommand from './commands/x-login';
import XhsBrowseCommand from './commands/xhs-browse';
import XhsInteractCommand from './commands/xhs-interact';
import XhsDownloadCommand from './commands/xhs-download';
import XhsLoginCommand from './commands/xhs-login';
import XhsPublishCommand from './commands/xhs-publish';
import ZhihuAccountCommand from './commands/zhihu-account';
import ZhihuInteractCommand from './commands/zhihu-interact';
import ZhihuListCommand from './commands/zhihu-list';
import ZhihuPublishCommand from './commands/zhihu-publish';
import ZhihuDeleteCommand from './commands/zhihu-delete';
import type {ZhihuCommentTarget, ZhihuFollowTarget} from './core/api/types';
import BiliBrowseCommand from './commands/bili-browse';
import BiliInteractCommand from './commands/bili-interact';
import BiliDownloadCommand from './commands/bili-download';
import BiliLoginCommand from './commands/bili-login';
import WeiboLoginCommand from './commands/weibo-login';
import WeiboBrowseCommand from './commands/weibo-browse';
import WeiboInteractCommand from './commands/weibo-interact';
import WeiboPublishCommand from './commands/weibo-publish';
import WeiboDownloadCommand from './commands/weibo-download';
import HnLoginCommand from './commands/hn-login';
import HnBrowseCommand from './commands/hn-browse';
import HnInteractCommand from './commands/hn-interact';
import HnPublishCommand from './commands/hn-publish';
import HnDownloadCommand from './commands/hn-download';
import V2exLoginCommand from './commands/v2ex-login';
import V2exBrowseCommand from './commands/v2ex-browse';
import V2exInteractCommand from './commands/v2ex-interact';
import V2exPublishCommand from './commands/v2ex-publish';
import V2exDownloadCommand from './commands/v2ex-download';
import RedditLoginCommand from './commands/reddit-login';
import RedditBrowseCommand from './commands/reddit-browse';
import RedditInteractCommand from './commands/reddit-interact';
import RedditPublishCommand from './commands/reddit-publish';
import RedditDownloadCommand from './commands/reddit-download';
import SummaryCommand from './commands/summary';
import UiHomeCommand from './commands/ui-home';
import UiAccountCenterCommand from './commands/ui-account-center';
import UiAccountPlatformCommand from './commands/ui-account-platform';

type Props = {
	readonly resolved: ResolvedCommand;
};

// The CLI dispatcher keeps the command-to-component routing explicit in one place.
// eslint-disable-next-line complexity
export default function App({resolved}: Props) {
	const {
		command,
		url,
		flags,
		limit,
		text,
		format,
		images,
		content,
		cookie,
		detail,
		topics,
		neutral,
		reply,
		yes,
		offset,
		extraArgs,
	} = resolved;

	const followTarget = (extraArgs?.[0] ?? 'user') as ZhihuFollowTarget;
	const commentTarget = (extraArgs?.[0] ?? 'answer') as ZhihuCommentTarget;

	switch (command) {
		// --- Interactive UI ---
		case 'ui-home': {
			return <UiHomeCommand flags={flags} />;
		}

		case 'ui-account-center': {
			return <UiAccountCenterCommand flags={flags} />;
		}

		case 'ui-account-platform': {
			return <UiAccountPlatformCommand url={url ?? ''} flags={flags} />;
		}

		// --- Zhihu download ---
		case 'article':
		case 'answer':
		case 'video': {
			return <DownloadCommand type={command} url={url!} flags={flags} />;
		}

		case 'column': {
			return <ColumnCommand url={url!} flags={flags} />;
		}

		case 'user': {
			return <UserCommand url={url!} flags={flags} />;
		}

		// --- Platform download ---
		case 'csdn': {
			return (
				<PlatformDownloadCommand platform="csdn" url={url!} flags={flags} />
			);
		}

		case 'weixin': {
			return (
				<PlatformDownloadCommand platform="weixin" url={url!} flags={flags} />
			);
		}

		case 'juejin': {
			return (
				<PlatformDownloadCommand platform="juejin" url={url!} flags={flags} />
			);
		}

		// --- Auth ---
		case 'login': {
			return <LoginCommand flags={flags} cookie={cookie} />;
		}

		// --- Browse ---
		case 'search':
		case 'hot':
		case 'question':
		case 'answers':
		case 'feed':
		case 'topic':
		case 'user-info':
		case 'user-answers':
		case 'user-articles': {
			return (
				<BrowseCommand
					browseType={command}
					query={url ?? ''}
					flags={flags}
					limit={limit}
					searchType={resolved.searchType}
					sortBy={resolved.sortBy}
					hasComments={resolved.includeComments}
					hasQuestions={resolved.includeQuestions}
					offset={offset}
				/>
			);
		}

		// --- X (Twitter) browse ---
		case 'x-search':
		case 'x-user':
		case 'x-timeline':
		case 'x-followers':
		case 'x-following':
		case 'x-mentions':
		case 'x-bookmarks':
		case 'x-metrics': {
			return (
				<XBrowseCommand
					browseType={command}
					query={url ?? ''}
					flags={flags}
					limit={limit}
					format={format}
				/>
			);
		}

		// --- X (Twitter) interact ---
		case 'x-post':
		case 'x-reply':
		case 'x-quote':
		case 'x-delete':
		case 'x-like':
		case 'x-retweet': {
			return (
				<XInteractCommand
					interactType={command}
					target={url ?? text ?? ''}
					text={text}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- X (Twitter) download ---
		case 'x-tweet': {
			return <XDownloadCommand url={url!} flags={flags} />;
		}

		// --- X (Twitter) login ---
		case 'x-login': {
			return <XLoginCommand flags={flags} />;
		}

		// --- XHS browse ---
		case 'xhs-search':
		case 'xhs-read':
		case 'xhs-feed':
		case 'xhs-topics':
		case 'xhs-user':
		case 'xhs-posts':
		case 'xhs-followers':
		case 'xhs-following': {
			return (
				<XhsBrowseCommand
					browseType={command}
					query={url ?? ''}
					flags={flags}
					limit={limit}
					format={format}
				/>
			);
		}

		// --- XHS interact ---
		case 'xhs-like':
		case 'xhs-unlike':
		case 'xhs-favorite':
		case 'xhs-unfavorite':
		case 'xhs-comment':
		case 'xhs-delete': {
			return (
				<XhsInteractCommand
					interactType={command}
					target={url ?? ''}
					text={text}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- XHS download ---
		case 'xhs-download': {
			return <XhsDownloadCommand noteId={url!} flags={flags} />;
		}

		// --- XHS auth ---
		case 'xhs-login':
		case 'xhs-whoami':
		case 'xhs-logout':
		case 'xhs-favorites': {
			return <XhsLoginCommand mode={command} flags={flags} format={format} />;
		}

		// --- XHS publish ---
		case 'xhs-post': {
			return (
				<XhsPublishCommand
					title={url ?? ''}
					content={content ?? text}
					images={images}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Bilibili browse ---
		case 'bili-search':
		case 'bili-video':
		case 'bili-user':
		case 'bili-videos':
		case 'bili-hot':
		case 'bili-ranking':
		case 'bili-related':
		case 'bili-comments': {
			return (
				<BiliBrowseCommand
					browseType={command}
					query={url ?? ''}
					flags={flags}
					limit={limit}
					format={format}
				/>
			);
		}

		// --- Bilibili interact ---
		case 'bili-like':
		case 'bili-coin':
		case 'bili-triple': {
			return (
				<BiliInteractCommand
					interactType={command}
					target={url ?? ''}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Bilibili download ---
		case 'bili-download': {
			return <BiliDownloadCommand bvid={url!} flags={flags} />;
		}

		// --- Bilibili auth ---
		case 'bili-login':
		case 'bili-whoami':
		case 'bili-logout': {
			return <BiliLoginCommand mode={command} flags={flags} format={format} />;
		}

		// --- Weibo auth ---
		case 'weibo-login':
		case 'weibo-whoami':
		case 'weibo-logout': {
			return <WeiboLoginCommand mode={command} flags={flags} format={format} />;
		}

		// --- Weibo browse ---
		case 'weibo-hot':
		case 'weibo-search':
		case 'weibo-feed':
		case 'weibo-read':
		case 'weibo-comments':
		case 'weibo-user':
		case 'weibo-posts':
		case 'weibo-favorites':
		case 'weibo-followers':
		case 'weibo-following': {
			return (
				<WeiboBrowseCommand
					browseType={command}
					query={url ?? ''}
					flags={flags}
					limit={limit}
					format={format}
					extraArgs={extraArgs}
				/>
			);
		}

		// --- Weibo interact ---
		case 'weibo-like':
		case 'weibo-unlike':
		case 'weibo-repost':
		case 'weibo-comment':
		case 'weibo-delete':
		case 'weibo-follow':
		case 'weibo-unfollow': {
			return (
				<WeiboInteractCommand
					interactType={command}
					target={url ?? ''}
					text={text}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Weibo publish ---
		case 'weibo-post': {
			return (
				<WeiboPublishCommand
					text={text ?? content ?? ''}
					images={images}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Weibo download ---
		case 'weibo-download': {
			return <WeiboDownloadCommand idstr={url!} flags={flags} />;
		}

		// --- HN auth ---
		case 'hn-login':
		case 'hn-whoami':
		case 'hn-logout': {
			return <HnLoginCommand mode={command} flags={flags} format={format} />;
		}

		// --- HN browse ---
		case 'hn-top':
		case 'hn-best':
		case 'hn-new':
		case 'hn-ask':
		case 'hn-show':
		case 'hn-jobs':
		case 'hn-search':
		case 'hn-item':
		case 'hn-user':
		case 'hn-user-submitted':
		case 'hn-comments': {
			return (
				<HnBrowseCommand
					browseType={command}
					query={url ?? ''}
					flags={flags}
					limit={limit}
					format={format}
					extraArgs={extraArgs}
				/>
			);
		}

		// --- HN interact ---
		case 'hn-upvote':
		case 'hn-unvote':
		case 'hn-favorite':
		case 'hn-unfavorite':
		case 'hn-comment':
		case 'hn-delete': {
			return (
				<HnInteractCommand
					interactType={command}
					target={url ?? ''}
					text={text}
					isConfirmed={yes}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- HN publish ---
		case 'hn-submit': {
			return (
				<HnPublishCommand
					text={text ?? ''}
					content={content}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- HN download ---
		case 'hn-download': {
			return <HnDownloadCommand itemId={url!} flags={flags} />;
		}

		// --- V2EX auth ---
		case 'v2ex-login':
		case 'v2ex-whoami':
		case 'v2ex-logout': {
			return (
				<V2exLoginCommand
					mode={command}
					flags={flags}
					cookie={cookie}
					format={format}
				/>
			);
		}

		// --- V2EX browse ---
		case 'v2ex-hot':
		case 'v2ex-latest':
		case 'v2ex-node':
		case 'v2ex-topics':
		case 'v2ex-topic':
		case 'v2ex-replies':
		case 'v2ex-member':
		case 'v2ex-notifications':
		case 'v2ex-my-topics':
		case 'v2ex-my-following': {
			return (
				<V2exBrowseCommand
					browseType={command}
					query={url ?? ''}
					flags={flags}
					limit={limit}
					format={format}
				/>
			);
		}

		// --- V2EX interact ---
		case 'v2ex-collect':
		case 'v2ex-uncollect':
		case 'v2ex-thank-topic':
		case 'v2ex-thank-reply':
		case 'v2ex-reply':
		case 'v2ex-delete-reply': {
			return (
				<V2exInteractCommand
					interactType={command}
					target={url ?? ''}
					text={text}
					isConfirmed={yes}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- V2EX publish ---
		case 'v2ex-new-topic': {
			return (
				<V2exPublishCommand
					node={url ?? ''}
					text={text ?? ''}
					content={content}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- V2EX download ---
		case 'v2ex-download': {
			return <V2exDownloadCommand topicId={url!} flags={flags} />;
		}

		// --- Reddit auth ---
		case 'reddit-login':
		case 'reddit-whoami':
		case 'reddit-logout': {
			return (
				<RedditLoginCommand
					mode={command}
					flags={flags}
					cookie={cookie}
					format={format}
				/>
			);
		}

		// --- Reddit browse ---
		case 'reddit-search':
		case 'reddit-subreddit':
		case 'reddit-hot':
		case 'reddit-top':
		case 'reddit-new':
		case 'reddit-read':
		case 'reddit-comments':
		case 'reddit-user':
		case 'reddit-user-posts':
		case 'reddit-user-comments':
		case 'reddit-saved':
		case 'reddit-subscribed': {
			return (
				<RedditBrowseCommand
					browseType={command}
					query={url ?? ''}
					flags={flags}
					limit={limit}
					format={format}
				/>
			);
		}

		// --- Reddit interact ---
		case 'reddit-upvote':
		case 'reddit-downvote':
		case 'reddit-unvote':
		case 'reddit-save':
		case 'reddit-unsave':
		case 'reddit-subscribe':
		case 'reddit-unsubscribe':
		case 'reddit-comment':
		case 'reddit-delete': {
			return (
				<RedditInteractCommand
					interactType={command}
					target={url ?? ''}
					text={text}
					isConfirmed={yes}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Reddit publish ---
		case 'reddit-submit': {
			return (
				<RedditPublishCommand
					subreddit={url ?? ''}
					text={text ?? ''}
					content={content}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Reddit download ---
		case 'reddit-download': {
			return (
				<RedditDownloadCommand
					postId={url!}
					subreddit={extraArgs?.[0]}
					flags={flags}
				/>
			);
		}

		// --- Zhihu Account ---
		case 'zhihu-login':
		case 'zhihu-logout':
		case 'zhihu-whoami':
		case 'zhihu-status': {
			return (
				<ZhihuAccountCommand
					kind={command}
					cookie={cookie}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Zhihu Interact ---
		case 'zhihu-vote':
		case 'zhihu-follow':
		case 'zhihu-unfollow':
		case 'zhihu-comment':
		case 'zhihu-uncomment': {
			return (
				<ZhihuInteractCommand
					kind={command}
					target={url ?? ''}
					followTarget={followTarget}
					commentTarget={commentTarget}
					text={text}
					reply={reply}
					isNeutral={neutral}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Zhihu Lists ---
		case 'zhihu-followers':
		case 'zhihu-following':
		case 'zhihu-collections':
		case 'zhihu-notifications':
		case 'zhihu-drafts':
		case 'zhihu-comments': {
			return (
				<ZhihuListCommand
					kind={command}
					target={url}
					commentTarget={commentTarget}
					limit={limit}
					offset={offset}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Zhihu Create ---
		case 'zhihu-ask': {
			return (
				<ZhihuPublishCommand
					kind="zhihu-ask"
					title={url ?? ''}
					body={detail}
					topics={topics}
					images={images}
					flags={flags}
					format={format}
				/>
			);
		}

		case 'zhihu-pin': {
			return (
				<ZhihuPublishCommand
					kind="zhihu-pin"
					title={url ?? ''}
					body={content}
					images={images}
					flags={flags}
					format={format}
				/>
			);
		}

		case 'zhihu-publish-article': {
			return (
				<ZhihuPublishCommand
					kind="zhihu-publish-article"
					title={url ?? ''}
					body={content}
					topics={topics}
					images={images}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- Zhihu Delete ---
		case 'zhihu-delete-question':
		case 'zhihu-delete-pin':
		case 'zhihu-delete-article': {
			return (
				<ZhihuDeleteCommand
					kind={command}
					target={url ?? ''}
					isConfirmed={yes}
					flags={flags}
					format={format}
				/>
			);
		}

		// --- AI Summary ---
		case 'summary': {
			return <SummaryCommand url={url!} flags={flags} format={format} />;
		}

		default: {
			return (
				<Box>
					<Text color="red">Unknown command: {command}</Text>
				</Box>
			);
		}
	}
}
