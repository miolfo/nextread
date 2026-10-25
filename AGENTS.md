# Repository guidance

## Scope and structure

- `IMPLEMENTATION_PLAN.md` defines the current demo scope; the mockup is a content/layout reference, not a pixel-perfect styling target.
- Recommendation's Generate button is an approved local-only experiment: it requires an explicitly selected import and calls authenticated `POST /api/recommendations`; production must keep the endpoint disabled. It has no results UI, AI, search, derived persistence, or user-facing feedback. Remove backend console logging before deployment. Upload remains within its existing scope.
- Recommendation preferences are transient local state. Keep AI/random counts independent and included/excluded genres mutually exclusive.
- `src/app/app/` is intentional: it produces `/app/import` and `/app/recommendations`. Both routes must work without an import or navigation prerequisite.
- Use the root npm manifest and lockfile for application dependencies; `.opencode/package.json` belongs to separate agent tooling.

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
- Vitest uses jsdom and `src/test/setup.ts` for jest-dom, cleanup, and DOM mocks. There is no configured Playwright/E2E runner. UI changes also warrant browser checks at 375, 768, and 1440px plus keyboard and console checks.
- `npm run format` rewrites the nonignored tree; prefer focused formatting for narrow edits. Formatting excludes the plan, designs, lockfile, and `.opencode` tooling.
- Do not hand-edit generated `.next/`, `next-env.d.ts`, or `tsconfig.tsbuildinfo`.
