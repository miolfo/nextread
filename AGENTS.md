# Repository guidance

## Scope and structure

- `IMPLEMENTATION_PLAN.md` defines the current demo scope; the mockup is a content/layout reference, not a pixel-perfect styling target.
- `src/app/app/` is intentional: it produces `/app/import` and `/app/recommendations`. Both routes must work without an import or navigation prerequisite.
- `src/lib` holds external integrations and cohesive shared/grouped functionality (for example, Supabase, Open Library, and recommendations); not every library module is an integration.
- Use the root npm manifest and lockfile for application dependencies; `.opencode/package.json` belongs to separate agent tooling.

## Documentation maintenance

- After each change, review `IMPLEMENTATION_PLAN.md` and other relevant documentation for stale information. Update stale docs in the same change; if no updates are needed, report that documentation was checked and no update was needed.

## UI conventions

- Keep routes as composition only. UI primitives live in `src/components/ui`; responsive presentation and styling belong under `src/components`, not route-level classes, inline styles, or page CSS modules. Import local components through `@/components` (`@/*` maps to `src/*`).
- shadcn uses **Base UI / `base-nova`**, not Radix. Follow existing `render={<Button ... />}` composition rather than assuming `asChild`.
- Tailwind v4 setup is CSS-first in `src/app/globals.css`. Limit global CSS to setup, theme tokens, and base styles; retain basic shadcn styling.
- Genre options expose persistent membership through `aria-checked`; cmdk's `aria-selected` tracks keyboard highlight, not membership. Preserve this distinction.

## Commands and verification

- Setup: `npm ci`; development: `npm run dev`.
- For authenticated local testing, configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in an ignored local env file (for example, `.env.local`). The local test account is documented in the ignored root `.sampleuser` file under `TEST_USERNAME` and `TEST_PASSWORD`; `TEST_USERNAME` is the account's email address. Use these only for local testing. Never copy the credentials into tracked files, source code, or command output.
- After application changes, run the configured checks from the repository root:

  ```sh
  npm run lint
  npm run format:check
  npm run typecheck
  npm test
  npm run build
  ```

- Focus tests with `npm test -- src/components/recommendation-controls.test.tsx`; append `-t "moves genres"` to select a test by name.
- Vitest uses jsdom and `src/test/setup.ts` for jest-dom, cleanup, and DOM mocks. There is no configured Playwright/E2E runner.
- After every application change, always load and follow the `ui-testing` skill and use Playwright to verify the affected routes and functionality, including authenticated flows when relevant. UI changes require checks at 375, 768, and 1440px plus keyboard checks. Documentation-only changes do not require browser testing.
- During Playwright verification, check for browser console errors, uncaught runtime errors, Next.js error overlays, and relevant Next.js development-server errors. Do not claim functionality is verified or that there are no Next.js errors unless these checks actually ran and passed.
- Always notify the user if Playwright testing fails, is blocked, or is skipped. State which checks did not pass or could not run and the specific, sanitized reason (for example, missing worktree credentials/configuration, MCP connection failure, or an application error). Distinguish failed checks from unexecuted checks; never silently omit them or report blocked checks as passed. Follow the skill's credential and worktree preparation before declaring authenticated testing blocked.
- `npm run format` rewrites the nonignored tree; prefer focused formatting for narrow edits. Formatting excludes the plan, designs, lockfile, and `.opencode` tooling.
- Do not hand-edit generated `.next/`, `next-env.d.ts`, or `tsconfig.tsbuildinfo`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
