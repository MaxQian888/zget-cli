# Release Process

This process defines how to cut stable versions of zget.

## Release Types

- Patch (`x.y.Z`): fixes and docs improvements
- Minor (`x.Y.0`): backward-compatible features
- Major (`X.0.0`): breaking changes

## Pre-Release Checklist

- [ ] `CHANGELOG.md` updated under `Unreleased`
- [ ] `package.json` version updated
- [ ] `pnpm verify:ci` passed
- [ ] Release tag will exactly match `package.json` version (`vX.Y.Z`)
- [ ] `NPM_TOKEN` secret is configured in GitHub Actions
- [ ] README examples remain accurate

## Step-by-Step Release

1. Update changelog and version.
2. Run full verification:

```bash
pnpm verify:ci
```

3. Commit and merge release prep to `main` / `master`.
4. Create and push the release tag:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

5. GitHub Actions `Release` workflow will automatically:

- validate the tag against `package.json`
- re-run `pnpm release:verify`
- create `zget-cli-X.Y.Z.tgz`
- create `zget-cli-vX.Y.Z-dist.tar.gz`
- publish the npm package
- create or update the GitHub Release and upload both assets

6. Verify the published package and GitHub Release page.

## Release Assets

The automated workflow uploads:

- npm tarball: `zget-cli-X.Y.Z.tgz`
- build archive: `zget-cli-vX.Y.Z-dist.tar.gz`

## Retry Behavior

- If the npm version is already published, the workflow skips `pnpm publish`.
- If the GitHub Release already exists, the workflow updates assets with `--clobber`.

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
