# zget Interactive Account Center Design

Date: 2026-04-11
Status: approved for planning

## Summary

This design adds a lightweight interactive shell to `zget` without replacing the existing command-first CLI.

The first release only covers one end-to-end path:

- `zget` with no positional arguments opens an interactive home screen
- the home screen links to an account center
- the account center shows unified status cards for supported platforms
- a platform detail page lets the user log in, re-check status, clear credentials, and inspect diagnostics
- existing explicit commands such as `zget x login` and `zget bili login` remain unchanged

## Why this change

The repository already supports multiple platforms and command families, but the current UX is optimized for users who already know the exact command surface. The command catalog is now broad enough that discoverability and account-state visibility are becoming product issues, not just documentation issues.

A focused interactive account center improves the first-run and maintenance experience while keeping backward compatibility with the existing CLI contract.

## Current repository truth

### Runtime entry and routing

- `source/cli.tsx` parses flags with `meow`, resolves the command, and currently falls back to help output when there is no positional input.
- `source/app.tsx` maps resolved commands directly to Ink command components.
- `source/commands/types.ts` defines the current command union and shared command payload shape.

### Existing auth and config seams

- Zhihu login flow lives in `source/commands/login.tsx` and `source/core/auth/qr-login.ts`.
- X credential loading lives in `source/core/auth/x-auth.ts`; validation is already performed in `source/commands/x-login.tsx` through `XApi.getMyUser()`.
- XHS cookie handling lives in `source/core/auth/xhs-auth.ts`; current command flows live in `source/commands/xhs-login.tsx`.
- Bilibili cookie and QR login handling live in `source/core/auth/bili-auth.ts`; command flows live in `source/commands/bili-login.tsx`.
- AI provider config loading lives in `source/core/ai/ai-config.ts`.
- Runtime config storage paths are centralized in `source/core/utils/config.ts` under `~/.zget-cli`.

### UI baseline

- The CLI already uses Ink `6.8.0`, React `19.2.4`, and `@inkjs/ui` `2.0.0` locally.
- This design assumes the current baseline and does not bundle an Ink major-version migration into the feature.

## Goals

1. Preserve all current explicit command entrypoints.
2. Make `zget` with no positional arguments open an interactive experience.
3. Introduce a mixed-navigation home screen.
4. Make account state visible across Zhihu, X, XHS, Bilibili, and AI config from one place.
5. Provide platform detail pages that support practical account actions.
6. Keep the first release small enough to validate with targeted Ink and command tests.

## Non-goals for the first release

- full task history or download history
- a full configuration editor
- batch workflow orchestration
- plugin architecture changes
- inline secret editing beyond the existing auth/config flows
- a global dashboard that merges account, task, and content features into one surface

## Product behavior

### Entry behavior

- `zget` -> interactive home screen
- `zget --help` -> existing help output
- `zget <existing command>` -> existing behavior

This keeps the current scriptability and automation story intact.

### Home screen

The home screen is a mixed navigation surface.

Top-level common actions:

- Download
- Browse
- Account Center
- Summary

Lower platform entry area:

- Zhihu
- X
- XHS
- Bilibili
- AI

The first release treats Account Center as the primary deep path. Other areas may stay shallow or placeholder-level if they do not block the account-center flow.

### Account center overview

The account center overview shows one card per platform.

Each card should expose a mostly consistent shape:

- platform name
- normalized status
- identity summary when available
- credential source summary
- last validation time when available
- latest error summary when present

The overview page is responsible for answering three questions quickly:

1. What is ready?
2. What is broken?
3. Where should the user go next?

### Platform detail page

A platform detail page is an operation page plus a diagnostic page.

It should show:

- current normalized status
- identity details if available
- credential source details
- latest validation result
- recent diagnostic text or suggested next step

It should offer these first-release actions:

- log in or re-log in
- re-check status
- clear local credentials
- inspect diagnostics

The exact auth flow behind those actions remains platform-specific.

## Information architecture

### Normalized status model

Every platform is mapped into one of four states:

- `missing`: no usable local configuration or credentials detected
- `detected`: local credentials/config detected, but not yet validated in the current status pass
- `ready`: credentials/config validated and usable
- `error`: credentials/config detected, but validation failed

This model is intentionally small so it is stable across different auth mechanisms.

### Platform-specific interpretation

- Zhihu: cookie/session presence plus API or auth validation
- X: env/file-backed credentials plus `getMyUser()` validation
- XHS: cookie presence plus lightweight authenticated probe
- Bilibili: cookie presence plus lightweight authenticated probe
- AI: config-file or env-backed provider setup plus config validity checks

## Architecture

### New resolved commands

Extend `source/commands/types.ts` with a small UI command set:

- `ui-home`
- `ui-account-center`
- `ui-account-platform`

`ui-account-platform` can carry the chosen platform through `url` or a small extension to the resolved payload. The implementation should prefer the smallest additive change that keeps the current parser simple.

### CLI changes

Update `source/cli.tsx` so that:

- explicit help flags still show help
- empty positional input resolves to `ui-home`
- all existing command parsing remains untouched otherwise

The resolver should remain explicit and avoid introducing a second hidden command grammar.

### App routing changes

Update `source/app.tsx` with three new UI branches:

- `UiHomeCommand`
- `UiAccountCenterCommand`
- `UiAccountPlatformCommand`

These should live under `source/commands/` so they follow the repository's current command-component convention.

### New account aggregation layer

Add a focused account domain under `source/core/account/`.

Recommended initial files:

- `source/core/account/types.ts`
- `source/core/account/account-status.ts`
- `source/core/account/platform-probes.ts`

Responsibilities:

- define platform keys and normalized account-state types
- read platform-specific stores/config
- run lightweight validation probes
- normalize platform results into one UI-facing shape
- expose small action helpers used by the account-center UI

### Important boundary

The new UI should reuse core auth/config logic, not reuse the existing command components as embedded children.

Reason:

- existing command components are built as one-shot command shells
- many of them use `useRunOnceEffect()` and `exit()`
- they are appropriate for command execution, but not as reusable nested workflow components

The reusable seam is the underlying store/auth/api logic, not the current command wrapper.

## Component responsibilities

### `UiHomeCommand`

- render the mixed navigation shell
- manage top-level focus and entry transitions
- route into account center or future workspaces

### `UiAccountCenterCommand`

- load and display normalized platform cards
- trigger overview-level refreshes
- route into a chosen platform detail page

### `UiAccountPlatformCommand`

- render detail information for one platform
- trigger platform-specific actions through the account layer
- refresh current platform state after each action
- expose diagnostics without dropping the user back to the shell unnecessarily

## Primary data flow

### Initial entry

1. `source/cli.tsx` resolves no-arg execution to `ui-home`
2. `source/app.tsx` renders `UiHomeCommand`
3. user navigates to account center
4. `UiAccountCenterCommand` requests normalized platform states from `source/core/account/`
5. the account layer reads local stores/config and optionally runs lightweight validation probes
6. normalized results are rendered as overview cards

### Platform action flow

1. user enters one platform detail page
2. `UiAccountPlatformCommand` requests the current normalized state for that platform
3. the user triggers an action such as login, re-check, or clear credentials
4. the platform-specific helper calls the existing lower-level auth/config logic
5. the account layer re-probes that platform and returns an updated normalized state
6. the detail page updates immediately and the overview reflects the refreshed summary on return

## Interaction design notes

### Ink primitives

The implementation should stay close to current Ink patterns:

- `useInput` for navigation and key handling
- `useFocusManager` for list/card focus transitions
- `useWindowSize` for responsive terminal layouts
- `@inkjs/ui` components such as `Spinner` where loading feedback is needed

### Non-interactive fallback

Do not force TUI rendering in non-interactive contexts.

For the first release, the safest behavior is:

- if there is no interactive TTY, do not open the interactive home screen
- instead fall back to the existing help output or a small safe text fallback

This avoids breaking CI, pipes, and scripted invocations.

## Error handling

The account center should unify presentation, not erase platform differences.

### Display rules

1. show a user-readable summary first
2. preserve the original error text for diagnostic view
3. distinguish missing configuration from failed validation
4. state platform limitations directly

### Examples

- X missing credentials -> explain that API credentials were not found in env or config storage
- XHS login limits -> explain browser/cookie limitations directly
- Zhihu or Bilibili QR expiry -> explain expiry and next retry step
- AI config missing -> explain env/config file options and provider expectations

### Refresh model

After an action runs in the platform detail page:

- refresh the current platform state immediately
- reflect the updated summary when returning to the overview page

The first release does not need a more complex global refresh bus.

## Testing strategy

### CLI resolution tests

Add resolver tests that verify:

- no positional args -> `ui-home`
- explicit `--help` still results in help behavior
- existing command resolution does not regress

### App routing tests

Add or update tests so the new UI commands render the intended top-level components.

### Account-state tests

Add unit tests for the account aggregation layer covering each normalized state:

- `missing`
- `detected`
- `ready`
- `error`

Mock store and API seams rather than hitting live network behavior.

### Ink interaction tests

Use `ink-testing-library` to cover at least:

- home-screen navigation
- entering account center
- entering platform detail
- running a platform action and updating displayed state
- returning to the previous page

### Verification gates

Feature completion should still align with repository quality gates in `docs/quality-gates.md`, especially:

- `pnpm test`
- targeted command/component/core tests
- `pnpm docs:check`
- `pnpm build:check`
- `pnpm build`
- `pnpm smoke`

## Delivery boundary for the first release

The first release is complete when this flow works end-to-end:

`zget` -> home screen -> account center -> platform detail -> action -> status update

Anything outside that path is optional and should not be allowed to derail the release.

## Follow-up candidates after the first release

- configuration center
- task/history center
- retry and recovery workflows
- richer platform quick actions on the overview page
- deeper browse/download workspace integration from the home screen

## Risks and mitigations

### Risk: command parser regressions

Mitigation: keep the parser change minimal and add resolver tests around the new no-arg behavior.

### Risk: forcing one auth model across incompatible platforms

Mitigation: normalize only the status model and UI shell; keep auth execution platform-specific.

### Risk: fragile UI reuse through existing command components

Mitigation: introduce a new core account aggregation layer and call shared lower-level logic instead of embedding one-shot command components.

### Risk: TUI behavior in non-interactive environments

Mitigation: explicitly guard non-TTY execution and fall back safely.
