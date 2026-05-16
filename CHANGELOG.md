# Changelog

All notable changes to this project are documented in this file.

This project follows:

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- [Semantic Versioning](https://semver.org/)

## How To Maintain This File

1. Add user-visible changes under `## [Unreleased]`.
2. Group entries by type:
   - `Added`
   - `Changed`
   - `Fixed`
   - `Removed`
   - `Security`
3. At release time:
   - Move unreleased entries to a new version section
   - Add release date in `YYYY-MM-DD`
   - Keep `Unreleased` section for future work

## [Unreleased]

### Added

- Hacker News platform: read commands (top / best / new / ask / show / jobs / search / item / user / comments), write commands (upvote / unvote / favorite / unfavorite / comment / delete / submit) and `download`. Login uses Playwright-driven cookie capture (HN has no public auth API)
- V2EX platform: read commands (hot / latest / node / topics / topic / replies / member / notifications / my-topics / my-following), write commands (collect / uncollect / thank-topic / thank-reply / reply / delete-reply / new-topic) and `download`. Login takes a Personal Access Token via `--cookie`
- Reddit platform: read commands (hot / top / new / search / subreddit / read / comments / user / user-posts / user-comments / saved / subscribed), write commands (upvote / downvote / unvote / save / unsave / subscribe / unsubscribe / comment / delete / submit) and `download`. Login takes a JSON blob of OAuth2 script-app credentials via `--cookie`
- Weibo (微博) platform: browse, download, interact, publish, and login command surface (`weibo hot / search / feed / read / comments / user / posts / favorites / followers / following / like / unlike / repost / comment / delete / follow / unfollow / post / download`)
- Zhihu account / interact / list / publish / delete commands (`zhihu login | logout | status | whoami | vote | follow | comment(s) | uncomment | followers | following | collections | notifications | drafts | ask | pin | publish-article | delete-question | delete-pin | delete-article`)
- Expanded global flag set: `--cookie`, `--detail` / `-d`, `--topic` (repeatable), `--neutral`, `--unfollow`, `--reply`, `--yes` / `-y`, `--type`, `--sort`, `--comments`, `--questions`, `--offset`
- Expanded template documentation to include detailed project governance
- Added troubleshooting and quality gate documentation under `docs/`
- Added automated tag-based release workflow for npm publishing and GitHub Release assets

### Changed

- Updated README, CLAUDE.md, and `docs/project-structure.md` to reflect 11 supported platforms (added Weibo, Hacker News, V2EX, Reddit) and the expanded Zhihu surface
- Auth model and persistent-state tables in CLAUDE.md now list all per-platform credential files (`weibo-cookies.json`, `hn-cookies.json`, `v2ex-token.json`, `reddit-credentials.json`) and reserved slots (`douban-cookies.json`, `bsky-session.json`) for in-development platforms
- Upgraded README and CONTRIBUTING content into executable workflow guides
- Expanded CI to cover core and command suites, smoke checks, and npm packaging verification

### Removed

- `.github/workflows/go-lint.yml` and the corresponding "Go Lint Pipeline Steps" section in `CI_CD.md` — `zget-cli` has no Go modules and the conditional workflow always no-op'd

## [0.0.0] - 2026-03-18

### Added

- Initial React Ink CLI template
- TypeScript compile pipeline (`pnpm build`)
- Prettier + XO quality checks (`pnpm test`)
- Base CI workflow and issue/PR templates

[unreleased]: https://github.com/<your-org>/<your-repo>/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/<your-org>/<your-repo>/releases/tag/v0.0.0
