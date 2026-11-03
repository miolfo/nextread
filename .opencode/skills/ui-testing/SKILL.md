---
name: UI Testing
description: Use Playwright to test the local Next Read app, including authenticated UI, responsive layouts, keyboard interactions, and browser errors. In a separate worktree, copy the missing ignored .sampleuser file from the main development worktree before connecting Playwright MCP.
---

# Local authenticated UI testing

Use this workflow for direct browser verification, not as a replacement for Vitest or the repository checks. Do not change application code unless the user also requested implementation.

## Prepare

1. Work from the repository root, not this skill's directory. Read `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, and the relevant components for the requested test. Existing uncommitted work may change expected behavior; do not overwrite it.
2. Before connecting Playwright MCP, check that `.sampleuser` exists and is ignored by Git, without printing its contents. In a separate worktree, if the file is missing, follow the worktree preparation below. It contains `TEST_USERNAME` (the email address) and `TEST_PASSWORD`. Check that local Supabase configuration is present without displaying env values. If either is unavailable, report the blocker; never invent credentials or use a service-role key.
3. Discover the available Playwright tools and read their schemas. Prefer the existing browser integration; this project has no configured Playwright/E2E runner. Do not install one or change dependencies just to perform these checks.
4. Reuse the project's running development server if available. Otherwise start `npm run dev` as a background process and use the local URL reported by Next.js; do not assume port 3000 if it is occupied. Wait for readiness, not an arbitrary sleep. Stop only a server you started when finished.
5. Use only the approved local app origin for these credentials. Stop if login redirects to an unexpected origin. A local app can still use a shared Supabase database: local browsing does not imply disposable data.

## Prepare credentials in a separate worktree

Git does not copy ignored files into new worktrees. This project's `--secrets .sampleuser` option makes Playwright MCP fail at startup if that file is missing, even for unauthenticated browsing.

- Identify the main development worktree using `git worktree list --porcelain` (the first worktree entry), rather than hard-coding a developer-specific path.
- If the current worktree differs from the main worktree and its root `.sampleuser` is absent, copy the main worktree's root `.sampleuser` directly to the current worktree's root using filesystem commands. Confirm the source is a regular file and both source and destination paths are ignored by Git before copying. Do not print or read its contents into tool output, and do not overwrite an existing destination (including a symlink).
- Give the copied file owner-only read/write permissions (`0600`). Never stage or commit it. If the source is missing, the paths are not ignored, or copying is denied, stop and report the blocker rather than bypassing safeguards.
- Prepare the file before the MCP connection. If startup already failed, ask the user to use `/reload` and check `/mcps` after the file is in place.

## Handle credentials privately

- Never print, `cat`, or read `.sampleuser` into model-visible tool output. Never paste credentials as literal tool arguments, source code, reports, or tracked files. Do not source the file as executable shell code.
- Use Playwright MCP's built-in secrets lookup described below. The MCP server reads `.sampleuser`; the agent passes only the key names. No filesystem access from browser snippets is required. Respect tool permissions; never bypass a denied capability.
- Do not log the parsed object, environment, form contents, cookies, storage state, auth responses, or request headers. Catch credential/login failures and return a generic error, not raw exception details that might include input values.
- Do not capture screenshots, snapshots, traces, or DOM dumps while login fields are populated. After login, avoid artifacts that reveal the account email or other personal data. Inspect console/network errors selectively and sanitize them before reporting.
- If tools cannot securely read and fill without exposing credentials, stop and ask the user to log in manually in the test browser. Do not fall back to printing the secrets. Do not persist a credential-bearing helper or browser storage state.

## Built-in MCP secrets

The root `opencode.json` overrides the `playwright` MCP server for this project. It runs `@playwright/mcp@latest` with `cwd: "."`, `--secrets .sampleuser`, and `--isolated`. The secrets path is relative to the repository workspace, not this skill's directory. The browser profile stays in memory; no saved auth state is required. The ignored secrets file must exist before the server connects.

After confirming the approved local login URL and inspecting the empty form, use `browser_fill_form` with secret **key names** as values:

```json
{
  "fields": [
    {
      "name": "Email address",
      "target": "#email",
      "type": "textbox",
      "value": "TEST_USERNAME"
    },
    {
      "name": "Password",
      "target": "#password",
      "type": "textbox",
      "value": "TEST_PASSWORD"
    }
  ]
}
```

Discover the current tool schema first; update selectors from the empty form if needed. `browser_type` also supports secret lookup through its `text` input. Do not prefix the key with `SECRET_` or wrap it in environment-variable syntax. The server substitutes the actual values and redacts known values in text responses. Arbitrary `page.fill()` calls inside `browser_run_code_unsafe` do **not** perform this lookup.

Redaction is a convenience, not a security boundary: it does not make screenshots, traces, videos, or arbitrary output safe. Keep recording/session saving disabled during login, do not request snapshots of populated fields, and do not inspect auth headers or payloads. If a key is missing, the tool can fill the literal key instead, so a successful fill does not prove the secrets configuration or login worked. Never read back the field values to diagnose this; ask the user to check the local file privately and verify the project MCP override is active.

OpenCode reloads configuration automatically; use `/reload` if needed and `/mcps` to inspect the connection. If secret lookup is unavailable, use manual sign-in in this same test browser rather than exposing credentials or weakening isolation. Since `latest` can change tool behavior, rediscover schemas and check the supported secrets behavior after upgrades.

## Sign in through the UI

1. Use an isolated test browser context when supported; do not disrupt an unrelated existing session. For an unauthenticated check, open `/app/recommendations` directly and confirm it redirects to `/app/login` with a safe local return path. If already authenticated and isolation is unavailable, report that the redirect check was skipped rather than claiming it passed.
2. On `/app/login`, locate inputs by labels **Email address** and **Password**, and the button by role and name **Sign in**. Inspect an empty form first if selectors need verification; prefer accessible locators to brittle CSS.
3. Fill with the built-in secret lookup above, recheck the approved local origin, and click **Sign in**. Otherwise ask for manual sign-in in this same test browser. Exercise the real form; do not bypass it by injecting cookies, local storage, or Supabase tokens.
4. Wait for navigation to the intended protected route and a route-specific visible heading. A click alone does not prove authentication succeeded. Confirm the login form is gone. On failure, report a sanitized authentication blocker and stop rather than repeatedly attempting login.
5. Once authenticated, navigate independently to `/app/import` and `/app/recommendations`. Neither page should require first visiting the other or completing an import. Generating recommendations does require a selected saved import.

## Verify the requested UI

- Keep the tested routes and interactions scoped to the user's request. Use current components and requirements as the source of truth; flag contradictions instead of silently deciding new behavior.
- At widths **375**, **768**, and **1440** pixels (with a practical viewport height), check readable content, wrapping, control widths, reachable actions, and absence of horizontal page overflow. Inspect the rendered browser, not just source code.
- Test keyboard-only Tab/Shift+Tab traversal, visible focus, labels, Enter/Space activation where appropriate, arrow-key navigation for selects/menus, and Escape dismissal. Do not try to activate deliberately disabled placeholders.
- For enabled genre controls, persistent membership is `aria-checked`; cmdk's `aria-selected` is keyboard highlight, not membership. If the controls are disabled placeholders in the current implementation, verify that state instead.
- Check empty, disabled, loading, and error states where safely reachable. Do not fabricate saved imports or expect a generated-results view where none is implemented.
- Inspect browser console errors and relevant failed requests after interactions. Distinguish application failures from external-service/configuration blockers. Do not dump auth request details or sensitive response bodies.
- Uploading/submitting a CSV persists import records. Generating recommendations can write subject counts and call Open Library. Only perform these write-producing actions when the user explicitly includes them in the test scope; otherwise restrict checks to navigation, presentation, and transient controls. Never delete existing records, change account roles, or alter shared data as cleanup.
- Test `/app/admin/subjects` only when requested. Do not grant admin privileges; a non-admin denial can be expected behavior.

## Finish and report

- Report the routes, viewport sizes, keyboard interactions, console checks, and outcomes actually observed. Mark checks as passed, failed, skipped, or blocked; never imply unexecuted checks passed.
- For each finding, give a short reproduction, expected versus actual behavior, and sanitized evidence. Keep screenshots in an ignored artifact directory or `/tmp/opencode`, never alongside tracked source by default.
- Close only browser contexts you created. Do not clear another session's cookies or storage. Do not retain credentials or session artifacts.
- For application changes, also run the checks required by `AGENTS.md`. Browser verification supplements them. For a testing-only task, do not change files or run unrelated fixes.
