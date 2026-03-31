# Reference Docs

Generated and maintained reference material lives here.

## Contents

- [CLI Reference](./cli.md)
- [Tooling Baseline](./tooling-baseline.md)
- [API Reference](./api/README.md)

## Update Flow

```bash
pnpm docs:generate
pnpm docs:check
```

`docs:generate` refreshes the committed reference files.
`docs:check` verifies the committed outputs still match current source.
