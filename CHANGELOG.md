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

- Expanded template documentation to include detailed project governance
- Added troubleshooting and quality gate documentation under `docs/`

### Changed

- Upgraded README and CONTRIBUTING content into executable workflow guides

## [0.0.0] - 2026-03-18

### Added

- Initial React Ink CLI template
- TypeScript compile pipeline (`pnpm build`)
- Prettier + XO quality checks (`pnpm test`)
- Base CI workflow and issue/PR templates

[unreleased]: https://github.com/<your-org>/<your-repo>/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/<your-org>/<your-repo>/releases/tag/v0.0.0
