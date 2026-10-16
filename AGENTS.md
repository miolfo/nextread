# Repository guidance

## Scope and structure

- `IMPLEMENTATION_PLAN.md` defines the current demo scope; the mockup is a content/layout reference, not a pixel-perfect styling target.
- Upload and recommendation action buttons are deliberately enabled, inert, and `type="button"`. Do not add a file picker, processing, results, feedback, backend/API integrations, or persistence unless requested.
- Recommendation preferences are transient local state. Keep AI/random counts independent and included/excluded genres mutually exclusive.
- `src/app/app/` is intentional: it produces `/app/import` and `/app/recommendations`. Both routes must work without an import or navigation prerequisite.
- Use the root npm manifest and lockfile for application dependencies; `.opencode/package.json` belongs to separate agent tooling.

## UI conventions

- Keep routes as composition only. UI primitives live in `src/components/ui`; responsive presentation and styling belong under `src/components`, not route-level classes, inline styles, or page CSS modules. Import local components through `@/components` (`@/*` maps to `src/*`).
- shadcn uses **Base UI / `base-nova`**, not Radix. Follow existing `render={<Button ... />}` composition rather than assuming `asChild`.
- Tailwind v4 setup is CSS-first in `src/app/globals.css`. Limit global CSS to setup, theme tokens, and base styles; retain basic shadcn styling.
- Genre options expose persistent membership through `aria-checked`; cmdk's `aria-selected` tracks keyboard highlight, not membership. Preserve this distinction.

## Commands and verification

- Setup: `npm ci`; development: `npm run dev`. No environment variables, API keys, or services are needed.
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
