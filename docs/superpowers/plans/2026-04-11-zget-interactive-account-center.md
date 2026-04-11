# zget Interactive Account Center Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a no-argument interactive Ink home screen that leads to a unified account center while preserving all existing explicit `zget` commands.

**Architecture:** Keep the command-surface change minimal: `source/cli.tsx` resolves empty input to a new UI command, `source/app.tsx` routes that command to new Ink pages, and a new `source/core/account/` layer normalizes platform auth/config state plus platform actions. The new UI pages consume shared stores and probes instead of embedding the existing one-shot login command components.

**Tech Stack:** TypeScript, Ink 6.8.0, React 19.2.4, `@inkjs/ui` 2.0.0, meow, Vitest, ink-testing-library, repo docs tooling.

---

**Spec:** `docs/superpowers/specs/2026-04-11-zget-interactive-account-center-design.md`

## Planned file structure

### Modify

- `source/commands/types.ts` — extend the command union with interactive UI commands and any minimal route payload needed for platform detail entry.
- `source/cli.tsx` — change the no-input resolver path, preserve existing explicit-command parsing, and add a safe non-interactive fallback if needed.
- `source/app.tsx` — route new UI commands to the new Ink pages without disturbing current command branches.
- `source/cli-metadata.ts` — update help text so the no-argument interactive entry is documented.
- `README.md` — document the new no-argument behavior and account-center entry.
- `README_zh.md` — same as `README.md`, localized.
- `docs/cli-design.md` — reflect the new interactive entry flow and routing strategy.
- `docs/project-structure.md` — add the new `source/core/account/` and UI command files to the ownership map.
- `tests/cli/cli.test.tsx` — lock the new no-argument resolver contract and explicit-command regressions.
- `tests/cli/app.test.tsx` — lock the new `App` routing branches.
- `tests/docs/cli-metadata.test.ts` — keep help text expectations aligned with the CLI contract.
- `tests/source/commands/test-helpers.tsx` — only if repeated interactive test helpers need to be centralized.

### Create

- `source/core/account/types.ts` — shared platform keys, normalized status model, identity summaries, and action result types.
- `source/core/account/platform-probes.ts` — local detection and remote validation probes per platform.
- `source/core/account/account-status.ts` — overview/detail snapshot builders that normalize probe results for the UI.
- `source/core/account/platform-actions.ts` — platform-specific re-check, clear, and login/setup action helpers used by the detail page.
- `source/commands/ui-home.tsx` — root interactive shell, top-level navigation, and state transitions into account center.
- `source/commands/ui-account-center.tsx` — overview page that renders normalized status cards.
- `source/commands/ui-account-platform.tsx` — platform detail page with action handling and diagnostics.
- `tests/core/account/platform-probes.test.ts` — local detection and validation probe coverage.
- `tests/core/account/account-status.test.ts` — overview/detail normalization coverage for `missing`, `detected`, `ready`, and `error`.
- `tests/core/account/platform-actions.test.ts` — action behavior coverage, including clear semantics and env-backed edge cases.
- `tests/source/commands/ui-home.test.tsx` — home-screen rendering and navigation coverage.
- `tests/source/commands/ui-account-center.test.tsx` — overview card rendering and selection coverage.
- `tests/source/commands/ui-account-platform.test.tsx` — detail-page rendering, action dispatch, and refresh coverage.

## Chunk 1: Command surface and route scaffolding

### Task 1: Lock the CLI contract before changing behavior

**Files:**

- Modify: `tests/cli/cli.test.tsx`
- Modify: `source/commands/types.ts`
- Modify: `source/cli.tsx`

- [ ] **Step 1: Write the failing resolver test for the new no-argument contract**

Add a new case next to the existing no-input test in `tests/cli/cli.test.tsx`.

```tsx
it('resolves the interactive home when no input is provided', () => {
	const showHelp = vi.fn();
	const cli = createCliStub({input: [], showHelp});

	expect(resolveCommand(cli)).toEqual({
		command: 'ui-home',
		flags: createExpectedFlags(),
	});
	expect(showHelp).not.toHaveBeenCalled();
});
```

Also keep one existing explicit command assertion nearby, for example `['x', 'login']`, so the contract change is clearly scoped.

- [ ] **Step 2: Run the targeted resolver test and confirm it fails for the right reason**

Run:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.commands.config.mjs tests/cli/cli.test.tsx
```

Expected: FAIL because `resolveCommand()` still returns `help` and still calls `showHelp(0)` for empty input.

- [ ] **Step 3: Implement the minimal resolver change**

Update the command type union first, then switch the empty-input branch in `source/cli.tsx`.

```ts
export type CommandName =
  | 'ui-home'
  | 'ui-account-center'
  | 'ui-account-platform'
  | /* existing commands */;
```

```ts
if (!first) {
	return {command: 'ui-home', flags};
}
```

Important guardrails:

- Do **not** rewrite existing subcommand parsing.
- Leave meow's built-in explicit help behavior alone unless a regression test proves that it needs extra handling.
- If you add a non-interactive fallback, keep it injectable or narrowly scoped so it is unit-testable.

- [ ] **Step 4: Re-run the targeted resolver test until it passes**

Run the same command again.

Expected: PASS, with the new `ui-home` assertion green and existing explicit-command cases still green.

- [ ] **Step 5: Commit the command-contract change**

```bash
git add source/commands/types.ts source/cli.tsx tests/cli/cli.test.tsx
git commit -m "feat: route no-arg invocations to interactive home"
```

### Task 2: Add `App` routing for the new UI entrypoints with placeholder pages

**Files:**

- Modify: `tests/cli/app.test.tsx`
- Modify: `source/app.tsx`
- Create: `source/commands/ui-home.tsx`
- Create: `source/commands/ui-account-center.tsx`
- Create: `source/commands/ui-account-platform.tsx`

- [ ] **Step 1: Write failing route tests for the three new command branches**

Mirror the existing `routeCases` pattern in `tests/cli/app.test.tsx`.

```tsx
{
  name: 'interactive home routes through UiHomeCommand',
  resolved: createResolved({command: 'ui-home'}),
  label: 'ui-home',
  fragments: [],
}
```

Mock the three new files at the top of the test file the same way the current command components are mocked.

- [ ] **Step 2: Run the `App` routing test and verify it fails on unknown-command fallback**

Run:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.commands.config.mjs tests/cli/app.test.tsx
```

Expected: FAIL because `App` still falls through to `Unknown command:` for `ui-home` / `ui-account-center` / `ui-account-platform`.

- [ ] **Step 3: Create minimal placeholder UI command components and route them**

Start with intentionally tiny components so the route tests turn green before the real UI work starts.

```tsx
export default function UiHomeCommand(): JSX.Element {
	return <Text>ui-home</Text>;
}
```

```tsx
case 'ui-home': {
  return <UiHomeCommand />;
}
```

Keep `UiAccountCenterCommand` and `UiAccountPlatformCommand` similarly small for now.

- [ ] **Step 4: Re-run the route test and confirm only the new branches changed**

Run the same command again.

Expected: PASS, with all old route cases still green.

- [ ] **Step 5: Commit the route skeleton**

```bash
git add source/app.tsx source/commands/ui-home.tsx source/commands/ui-account-center.tsx source/commands/ui-account-platform.tsx tests/cli/app.test.tsx
git commit -m "feat: add interactive UI route skeleton"
```

## Chunk 2: Unified account domain

### Task 3: Build local detection probes for every platform

**Files:**

- Create: `source/core/account/types.ts`
- Create: `source/core/account/platform-probes.ts`
- Create: `tests/core/account/platform-probes.test.ts`

- [ ] **Step 1: Write failing probe tests for local detection and credential-source reporting**

Cover the smallest set of truths first:

- Zhihu cookie store missing -> `missing`
- X credentials found in env or file -> `detected`
- XHS authenticated cookie store -> `detected`
- Bilibili authenticated cookie store -> `detected`
- AI config present -> `detected`

Example test shape:

```ts
it('marks X as detected when credentials are available', async () => {
	const result = await probeXLocalState();
	expect(result).toMatchObject({
		platform: 'x',
		status: 'detected',
		credentialSource: 'env',
	});
});
```

Mock the underlying stores/config modules instead of touching real `~/.zget-cli` state.

- [ ] **Step 2: Run the targeted core probe test and confirm it fails because the module does not exist yet**

Run:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.core.config.ts tests/core/account/platform-probes.test.ts
```

Expected: FAIL with import/module-not-found errors for the new account files.

- [ ] **Step 3: Implement the shared types and local probes**

Create a small normalized contract in `source/core/account/types.ts`.

```ts
export type AccountPlatform = 'zhihu' | 'x' | 'xhs' | 'bili' | 'ai';
export type AccountStatus = 'missing' | 'detected' | 'ready' | 'error';
```

In `platform-probes.ts`, keep the first pass narrow:

- read stores/config
- report whether credentials/config exist
- report credential source (`env`, `file`, `cookies`, `none`)
- do **not** mix in remote validation yet

- [ ] **Step 4: Re-run the probe test until the local-detection cases pass**

Run the same command again.

Expected: PASS for the local-detection matrix.

- [ ] **Step 5: Commit the probe foundation**

```bash
git add source/core/account/types.ts source/core/account/platform-probes.ts tests/core/account/platform-probes.test.ts
git commit -m "feat: add normalized local account probes"
```

### Task 4: Add validation-aware overview/detail snapshot builders

**Files:**

- Modify: `source/core/account/platform-probes.ts`
- Create: `source/core/account/account-status.ts`
- Create: `tests/core/account/account-status.test.ts`

- [ ] **Step 1: Write failing normalization tests for `missing`, `detected`, `ready`, and `error`**

Focus on UI-facing snapshot builders, for example `getAccountOverview()` and `getPlatformAccountState(platform)`.

```ts
it('returns ready for X when getMyUser succeeds', async () => {
	const overview = await getAccountOverview();
	expect(overview.find(item => item.platform === 'x')).toMatchObject({
		status: 'ready',
		identity: {handle: '@tester'},
	});
});
```

Also add an error-path test, such as X credentials detected but `getMyUser()` throwing, and keep at least one `missing` case in the same file.

- [ ] **Step 2: Run the targeted account-status test and confirm the missing implementation failure**

Run:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.core.config.ts tests/core/account/account-status.test.ts
```

Expected: FAIL because the snapshot builder functions do not exist yet.

- [ ] **Step 3: Implement overview/detail normalization with lightweight remote validation**

In `source/core/account/account-status.ts`:

- call the local probes first
- run only lightweight validation methods (`XApi.getMyUser()`, Bili `getMyInfo()`, XHS authenticated probe, AI config validity checks)
- fill `latestError`, `identity`, and `lastValidatedAt`
- keep the returned shape UI-friendly and serializable

Do **not** trigger mutating actions in this layer.

- [ ] **Step 4: Re-run the account-status test until all four normalized states pass**

Run the same command again.

Expected: PASS for `missing`, `detected`, `ready`, and `error` cases.

- [ ] **Step 5: Commit the snapshot layer**

```bash
git add source/core/account/platform-probes.ts source/core/account/account-status.ts tests/core/account/account-status.test.ts
git commit -m "feat: add account overview and detail snapshots"
```

### Task 5: Add platform actions for re-check, clear, and setup/login handoff

**Files:**

- Create: `source/core/account/platform-actions.ts`
- Create: `tests/core/account/platform-actions.test.ts`
- Modify: `source/core/account/types.ts`
- Modify: `source/core/account/account-status.ts`

- [ ] **Step 1: Write failing tests for action behavior and platform-specific capability differences**

Cover at least:

- Zhihu clear action empties persisted cookies
- XHS clear action empties persisted cookies
- Bilibili clear action empties persisted cookies
- X file-backed credentials can be cleared, env-backed credentials return a non-destructive diagnostic
- AI file-backed config can be cleared, env-backed config returns a non-destructive diagnostic
- re-check delegates back through the snapshot/probe layer

Example assertion:

```ts
it('does not destructively clear env-backed X credentials', async () => {
	const result = await runPlatformAction('x', 'clear');
	expect(result).toMatchObject({
		ok: false,
		message: 'X credentials are coming from environment variables.',
	});
});
```

- [ ] **Step 2: Run the targeted action test and confirm it fails because the action layer is missing**

Run:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.core.config.ts tests/core/account/platform-actions.test.ts
```

Expected: FAIL with missing exports or action-layer implementation errors.

- [ ] **Step 3: Implement the action helpers with capability-aware behavior**

Recommended minimal API:

```ts
export async function runPlatformAction(
	platform: AccountPlatform,
	action: 'login' | 'recheck' | 'clear',
): Promise<AccountActionResult> {
	/* ... */
}
```

Implementation notes:

- `login` may mean very different things by platform; let the result carry a message and next-step hint when the platform is not truly interactive (for example X or AI).
- `clear` should be destructive only for repo-managed file/cookie state.
- `recheck` should return a freshly normalized platform snapshot.

- [ ] **Step 4: Re-run the targeted action test until the capability cases pass**

Run the same command again.

Expected: PASS for clear/recheck/login-handoff behavior.

- [ ] **Step 5: Commit the action layer**

```bash
git add source/core/account/types.ts source/core/account/account-status.ts source/core/account/platform-actions.ts tests/core/account/platform-actions.test.ts
git commit -m "feat: add unified account actions"
```

## Chunk 3: Interactive UI, docs, and verification

### Task 6: Replace the placeholder home page with a stateful mixed-navigation shell

**Files:**

- Modify: `source/commands/ui-home.tsx`
- Create: `tests/source/commands/ui-home.test.tsx`
- Modify: `tests/source/commands/test-helpers.tsx` (only if keypress helpers become repetitive)

- [ ] **Step 1: Write failing Ink tests for home-screen rendering and entering the account center**

Cover at least:

- home screen shows common actions (`Download`, `Browse`, `Account Center`, `Summary`)
- home screen shows lower platform entries
- keyboard selection or Enter on `Account Center` transitions into the overview page

Example shape:

```tsx
it('opens the account center from the home screen', async () => {
	const app = render(<UiHomeCommand />);
	app.stdin.write('\r');
	await flushAsync();
	expect(app.lastFrame()).toContain('Account Center');
});
```

- [ ] **Step 2: Run the targeted home-screen test and verify the placeholder fails**

Run:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.commands.config.mjs tests/source/commands/ui-home.test.tsx
```

Expected: FAIL because the current placeholder only prints `ui-home`.

- [ ] **Step 3: Implement the stateful home shell**

In `source/commands/ui-home.tsx`:

- hold the current screen in component state
- render the mixed navigation list/card layout
- on `Account Center`, render or delegate to `UiAccountCenterCommand`
- keep the shell as the parent owner of back-navigation state so the child pages remain mostly prop-driven

Do **not** build download/browse workspaces here yet; they can remain placeholders or disabled entries.

- [ ] **Step 4: Re-run the home-screen test until the navigation path passes**

Run the same command again.

Expected: PASS for home rendering and account-center entry.

- [ ] **Step 5: Commit the home shell**

```bash
git add source/commands/ui-home.tsx tests/source/commands/ui-home.test.tsx tests/source/commands/test-helpers.tsx
git commit -m "feat: add interactive home shell"
```

### Task 7: Build the account-center overview and platform-detail pages on top of the account layer

**Files:**

- Modify: `source/commands/ui-account-center.tsx`
- Modify: `source/commands/ui-account-platform.tsx`
- Create: `tests/source/commands/ui-account-center.test.tsx`
- Create: `tests/source/commands/ui-account-platform.test.tsx`
- Modify: `source/commands/ui-home.tsx`

- [ ] **Step 1: Write failing overview and detail-page tests before replacing the placeholders**

Overview test minimum:

- renders one card per platform
- shows normalized status text
- selecting a card opens the matching detail page

Detail test minimum:

- shows identity/credential source/diagnostic sections
- action list includes the capability-appropriate actions
- running `recheck` or `clear` refreshes the displayed snapshot

Example detail assertion:

```tsx
it('refreshes the displayed state after recheck', async () => {
	const app = render(
		<UiAccountPlatformCommand platform="x" onBack={() => {}} />,
	);
	app.stdin.write('\r');
	await flushAsync();
	expect(app.lastFrame()).toContain('Last checked');
});
```

- [ ] **Step 2: Run the targeted overview/detail tests and confirm the placeholders fail**

Run:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.commands.config.mjs tests/source/commands/ui-account-center.test.tsx tests/source/commands/ui-account-platform.test.tsx
```

Expected: FAIL because the placeholder pages do not yet load snapshots or react to actions.

- [ ] **Step 3: Implement overview cards and detail-page action wiring**

Implementation checklist:

- `UiAccountCenterCommand` calls the overview snapshot builder and renders loading/error states cleanly.
- `UiAccountPlatformCommand` loads one platform snapshot, renders sections for status/identity/credentials/diagnostics, and dispatches through `runPlatformAction()`.
- `UiHomeCommand` passes navigation callbacks so the user can move home -> overview -> detail -> back.
- keep actions non-blocking and show `Spinner` for long-running checks.

- [ ] **Step 4: Re-run the targeted overview/detail tests until they pass**

Run the same command again.

Expected: PASS for overview rendering, detail rendering, and post-action refresh behavior.

- [ ] **Step 5: Commit the account-center UI**

```bash
git add source/commands/ui-home.tsx source/commands/ui-account-center.tsx source/commands/ui-account-platform.tsx tests/source/commands/ui-account-center.test.tsx tests/source/commands/ui-account-platform.test.tsx
git commit -m "feat: add interactive account center pages"
```

### Task 8: Update docs/help text and run the full verification stack

**Files:**

- Modify: `source/cli-metadata.ts`
- Modify: `tests/docs/cli-metadata.test.ts`
- Modify: `README.md`
- Modify: `README_zh.md`
- Modify: `docs/cli-design.md`
- Modify: `docs/project-structure.md`
- Generated: `docs/reference/**` (via tooling only, no hand edits)

- [ ] **Step 1: Write or update the failing docs/help assertion first**

Adjust `tests/docs/cli-metadata.test.ts` so the generated help text documents the interactive entry.

```ts
expect(helpText).toContain(
	'$ zget                         Open the interactive home screen',
);
```

Keep the existing command examples intact so the docs test still guards backward compatibility.

- [ ] **Step 2: Run the targeted docs test and confirm it fails before the help text changes**

Run:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.config.ts tests/docs/cli-metadata.test.ts
```

Expected: FAIL because the help text does not mention the interactive home screen yet.

- [ ] **Step 3: Update help text and human-written docs**

Make the documentation changes in this order:

1. `source/cli-metadata.ts`
2. `README.md`
3. `README_zh.md`
4. `docs/cli-design.md`
5. `docs/project-structure.md`

Then regenerate reference docs:

```bash
pnpm docs:generate
```

- [ ] **Step 4: Run the full verification stack**

Run, in order:

```bash
pnpm exec vitest run --configLoader native --pool threads --config vitest.commands.config.mjs tests/cli/cli.test.tsx tests/cli/app.test.tsx tests/source/commands/ui-home.test.tsx tests/source/commands/ui-account-center.test.tsx tests/source/commands/ui-account-platform.test.tsx
pnpm exec vitest run --configLoader native --pool threads --config vitest.core.config.ts tests/core/account/platform-probes.test.ts tests/core/account/account-status.test.ts tests/core/account/platform-actions.test.ts
pnpm exec vitest run --configLoader native --pool threads --config vitest.config.ts tests/docs/cli-metadata.test.ts
pnpm test
pnpm docs:check
pnpm build:check
pnpm build
pnpm smoke
```

If all targeted checks are green, finish with the repository-level gate:

```bash
pnpm ci:local
```

Expected: all commands PASS, with `pnpm smoke` showing the built CLI help and `pnpm ci:local` exiting 0.

- [ ] **Step 5: Commit the docs + verification-ready release slice**

```bash
git add source/cli-metadata.ts README.md README_zh.md docs/cli-design.md docs/project-structure.md docs/reference tests/docs/cli-metadata.test.ts
git commit -m "docs: document the interactive account center"
```

## Execution notes

- Follow @superpowers:test-driven-development discipline inside every task: write the failing test first, watch it fail, make the smallest implementation change, then re-run the test.
- Use @superpowers:verification-before-completion before claiming the feature is done.
- Keep commits scoped to the task boundaries above; do not collapse the entire feature into one giant commit unless the worktree forces a later squash.
- If non-interactive fallback behavior is ambiguous in implementation, prefer the smallest safe behavior (`show help`) and add a focused regression test before broadening the shell logic.
- Do not hand-edit generated docs under `docs/reference/`; regenerate them with tooling.
