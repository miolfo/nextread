---
name: UI Testing
description: Use Playwright to log in to the local Next Read app with the ignored .sampleuser account and test the UI, responsive layouts, keyboard interactions, and browser errors.
---

# Local authenticated UI testing

Use this workflow for direct browser verification, not as a replacement for Vitest or the repository checks. Do not change application code unless the user also requested implementation.

## Prepare

1. Work from the repository root, not this skill's directory. Read `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, and the relevant components for the requested test. Existing uncommitted work may change expected behavior; do not overwrite it.
2. Discover the available Playwright tools and read their schemas. Prefer the existing browser integration; this project has no configured Playwright/E2E runner. Do not install one or change dependencies just to perform these checks.
3. Check that `.sampleuser` exists and is ignored by Git, without printing its contents. It contains `TEST_USERNAME` (the email address) and `TEST_PASSWORD`. Check that local Supabase configuration is present without displaying env values. If either is unavailable, report the blocker; never invent credentials or use a service-role key.
4. Reuse the project's running development server if available. Otherwise start `npm run dev` as a background process and use the local URL reported by Next.js; do not assume port 3000 if it is occupied. Wait for readiness, not an arbitrary sleep. Stop only a server you started when finished.
5. Use only the approved local app origin for these credentials. Stop if login redirects to an unexpected origin. A local app can still use a shared Supabase database: local browsing does not imply disposable data.

## Handle credentials privately

- Never print, `cat`, or read `.sampleuser` into model-visible tool output. Never paste credentials as literal tool arguments, source code, reports, or tracked files. Do not source the file as executable shell code.
- Prefer a Playwright server-side code tool that can read the local file and fill the form within the same execution. Discover this tool's capabilities and respect its permissions; do not bypass a denied tool. Read the file in the server-side Node runtime, not through `page.evaluate` (which runs in the browser). Parse only the required env-style entries with a non-executing parser, such as Node's `util.parseEnv` when supported. Keep values in memory and return only a sanitized success/failure status.
- Confirm that the browser tool can access the repository filesystem before using this approach. Do not assume the browser server's current directory is the repository root. Supply the resolved root path, never the secret values.
- Do not log the parsed object, environment, form contents, cookies, storage state, auth responses, or request headers. Catch credential/login failures and return a generic error, not raw exception details that might include input values.
- Do not capture screenshots, snapshots, traces, or DOM dumps while login fields are populated. After login, avoid artifacts that reveal the account email or other personal data. Inspect console/network errors selectively and sanitize them before reporting.
- If tools cannot securely read and fill without exposing credentials, stop and ask the user to log in manually in the test browser. Do not fall back to printing the secrets. Do not persist a credential-bearing helper or browser storage state.

## Sign in through the UI

1. Use an isolated test browser context when supported; do not disrupt an unrelated existing session. For an unauthenticated check, open `/app/recommendations` directly and confirm it redirects to `/app/login` with a safe local return path. If already authenticated and isolation is unavailable, report that the redirect check was skipped rather than claiming it passed.
2. On `/app/login`, locate inputs by labels **Email address** and **Password**, and the button by role and name **Sign in**. Inspect an empty form first if selectors need verification; prefer accessible locators to brittle CSS.
3. In the private server-side execution described above, fill Email address from `TEST_USERNAME` and Password from `TEST_PASSWORD`, then click Sign in. Exercise the real form; do not bypass it by injecting cookies, local storage, or Supabase tokens.
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
