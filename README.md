# Next Read

A book discovery demo built with Next.js App Router, Supabase email/password auth, TypeScript,
Tailwind CSS, local shadcn/ui components (the CLI's standard Base Nova defaults),
and Lucide icons.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Create a Supabase project and copy `.env.example` to `.env.local`, then set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the project's
API settings. Never use or expose a service-role key in this app. In Supabase
Authentication URL Configuration, set the local site URL to
`http://localhost:3000` and add `http://localhost:3000/auth/callback` as a
redirect URL. Add the equivalent production callback URL when deploying. Email
confirmation can be enabled; users will need to confirm through the callback
before they can sign in. Set the same two public environment variables in Vercel.

Visit `http://localhost:3000`; `/` is public and app routes require sign-in.

The import screen accepts any selected file and posts it to a local mock endpoint,
which logs its filename and returns a fixed import ID. The review page is a static
illustration and does not reflect the uploaded file. Recommendation action buttons
remain inert; preferences live in component state and reset on refresh. There is no
file parsing, database persistence/tables, or recommendation service integration.

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
