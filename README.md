# react-cli-quick-starter

A production-ready **React Ink CLI template** focused on maintainability, quality checks, and clear documentation architecture.

[中文文档](./README_zh.md)

## What This Template Includes

- React Ink CLI baseline (`ink` + `meow`)
- TypeScript compilation pipeline
- Formatting and lint quality gates (`prettier` + `xo`)
- GitHub Actions CI workflow (`.github/workflows/ci.yml`)
- Built-in documentation architecture for onboarding and long-term project governance

## When To Use This Template

Use this template when you want:

- A terminal UI CLI based on React components
- A clean starting point for command-driven tools
- A template that already includes contribution, testing, and release conventions

## Prerequisites

- Node.js 20+
- pnpm 8+ (recommended 10+)

Install pnpm if needed:

```bash
npm install -g pnpm
```

## Quick Start

```bash
pnpm install
pnpm build
node dist/cli.js --name=Jane
```

Expected output:

```text
Hello, Jane
```

## CLI Usage

### Basic

```bash
node dist/cli.js
```

### With Option

```bash
node dist/cli.js --name=Jane
```

### Option Reference

| Option          | Type      | Default    | Description                            |
| --------------- | --------- | ---------- | -------------------------------------- |
| `--name`        | `string`  | `Stranger` | Name used in greeting output           |
| `--interactive` | `boolean` | `false`    | Enable interactive mode with key input |

## Development Workflow

1. Install dependencies: `pnpm install`
2. Run watch mode while coding: `pnpm dev`
3. Validate repository quality: `pnpm test`
4. Validate docs pipeline: `pnpm test:docs && pnpm docs:check`
5. Verify compilation output: `pnpm build`
6. Smoke run built CLI: `node dist/cli.js --name=Jane`

## Script Reference

| Script                    | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                | TypeScript watch compile                                    |
| `pnpm build`              | Compile source into `dist/`                                 |
| `pnpm ci:local`           | Run the same quality/doc/build gate sequence as pre-push    |
| `pnpm docs:generate`      | Regenerate committed reference docs under `docs/reference/` |
| `pnpm docs:check`         | Fail if generated docs are stale or missing                 |
| `pnpm lint:staged`        | Run pre-commit style checks only against staged files       |
| `pnpm lint`               | Run XO lint checks                                          |
| `pnpm format`             | Format all supported files with Prettier                    |
| `pnpm format:check`       | Check formatting without modifying files                    |
| `pnpm test`               | Run formatting check + lint checks                          |
| `pnpm test:docs`          | Run docs pipeline and Ink rendering tests                   |
| `pnpm test:docs:coverage` | Run docs tests with coverage thresholds                     |

## Project Layout

```text
react-cli-quick-starter/
├── source/
│   ├── app.tsx                  # Ink UI component
│   ├── cli-metadata.ts          # Shared CLI contract for runtime + docs
│   └── cli.tsx                  # CLI entrypoint + argument parsing
├── tests/
│   ├── cli/
│   └── docs/
├── tools/
│   └── docs/                    # Docs generation + freshness checks
├── docs/
│   ├── README.md                # Docs navigation hub
│   ├── project-structure.md
│   ├── development-workflow.md
│   ├── cli-design.md
│   ├── quality-gates.md
│   ├── troubleshooting.md
│   └── reference/
│       ├── README.md
│       ├── cli.md
│       ├── tooling-baseline.md
│       └── api/
│   └── release-process.md
├── .github/
│   ├── workflows/ci.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
├── CONTRIBUTING.md
├── TESTING.md
├── CI_CD.md
├── CHANGELOG.md
├── package.json
└── tsconfig.json
```

## Documentation Architecture

- Docs hub: [docs/README.md](./docs/README.md)
- Project map: [docs/project-structure.md](./docs/project-structure.md)
- Development flow: [docs/development-workflow.md](./docs/development-workflow.md)
- CLI design rules: [docs/cli-design.md](./docs/cli-design.md)
- Quality gates: [docs/quality-gates.md](./docs/quality-gates.md)
- Troubleshooting: [docs/troubleshooting.md](./docs/troubleshooting.md)
- Reference docs: [docs/reference/README.md](./docs/reference/README.md)
- Release process: [docs/release-process.md](./docs/release-process.md)

## Governance Docs

- Contribution policy: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Validation strategy: [TESTING.md](./TESTING.md)
- CI/CD conventions: [CI_CD.md](./CI_CD.md)
- Release history: [CHANGELOG.md](./CHANGELOG.md)

## License

MIT. See [LICENSE](./LICENSE).
