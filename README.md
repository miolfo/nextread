# Next Read

A frontend-only book discovery UI built with Next.js App Router, TypeScript,
Tailwind CSS, local shadcn/ui components (the CLI's standard Base Nova defaults),
and Lucide icons.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Visit `http://localhost:3000`, `/app/import`, or `/app/recommendations` directly.
No environment variables, API keys, backend, or external fonts are required.

The import button and recommendation action buttons are intentionally inert.
Recommendation preferences only live in component state and reset on refresh.
There is no file processing, persistence, or recommendation service integration.

## Verification

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

`npm run format` formats application and configuration files, leaving the original
plan, design, and `.opencode` tooling untouched. Tests use Vitest and Testing
Library. Run `npm start` after a production build to preview production output.

Route files compose local components without page-level styling. UI primitives
and responsive application presentation live under `src/components`.
