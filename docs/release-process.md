# Release Process

This process defines how to cut stable versions from this template.

## Release Types

- Patch (`x.y.Z`): fixes and docs improvements
- Minor (`x.Y.0`): backward-compatible features
- Major (`X.0.0`): breaking changes

## Pre-Release Checklist

- [ ] `CHANGELOG.md` updated under `Unreleased`
- [ ] `package.json` version updated
- [ ] `pnpm test` passed
- [ ] `pnpm test:docs` passed
- [ ] `pnpm docs:check` passed
- [ ] `pnpm build` passed
- [ ] Smoke run verified (`node dist/cli.js --name=Jane`)
- [ ] README examples remain accurate

## Step-by-Step Release

1. Update changelog and version.
2. Run validation:

```bash
pnpm test
pnpm test:docs
pnpm docs:check
pnpm build
node dist/cli.js --name=Jane
```

3. Commit release prep:

```bash
git add .
git commit -m "chore: release vX.Y.Z"
```

4. Create tag:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

5. (Optional) Publish package:

```bash
pnpm publish --access public
```

## Post-Release Tasks

- Move released entries from `Unreleased` to versioned section (if not already done).
- Create a new empty `Unreleased` section.
- Verify CI on default branch is green.

## Rollback Guidance

If a bad release is published:

1. Stop publishing additional versions.
2. Patch quickly with a follow-up version.
3. Document impact and fix in changelog.
4. If registry policy allows, deprecate affected version.
