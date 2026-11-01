# Next Read — Frontend WIP Implementation Plan

## 1. Objective

Create a responsive Next Read demo with Supabase email/password authentication and frontend-only book discovery features based on a user's Goodreads reading history, ratings, reviews, and preferences.

Use `designs/Next Read Finder UI Mockup.png` as a reference for content and layout, not as a pixel-perfect styling specification. Start with basic shadcn/ui styling and minimal visual customization.

This document describes the current demo behavior and acceptance scope.

## 2. Stack

- Next.js with the App Router.
- TypeScript.
- Tailwind CSS, primarily through the local shadcn components.
- shadcn/ui for interface components.
- Lucide React (`lucide-react`) for icons, including `BookOpen`, `Upload`, `Info`, `Sparkles`, and `Shuffle`.
- Use npm consistently and include `package-lock.json` when implementation is eventually committed.

## 3. Routes

| URL | Purpose |
| --- | --- |
| `/` | Minimal splash page explaining the application. |
| `/app/import` | Goodreads CSV import screen. |
| `/app/imports` | Saved-import review. |
| `/app/login` | Email/password sign-in. |
| `/app/recommendations` | Mock recommendation configuration screen. |
| `/app/admin/subjects` | Read-only admin view of subject candidates. |
| `/auth/callback` | Supabase authentication callback. |
| `/api/import` | Goodreads CSV import endpoint. |
| `/api/recommendations` | Local-only recommendation experiment endpoint. |

The import and recommendation views are independently accessible without a navigation prerequisite. Recommendation generation itself requires an explicitly selected authenticated import. The admin subject page requires a verified user whose trusted `app_metadata.is_admin` is boolean `true`.

Route sources are `src/app/page.tsx`, `src/app/app/login/page.tsx`, `src/app/app/(protected)/import/page.tsx`, `src/app/app/(protected)/imports/page.tsx`, `src/app/app/(protected)/recommendations/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/api/import/route.ts`, and `src/app/api/recommendations/route.ts`. The `app` directory segment and protected route group produce the `/app/...` URLs.

## 4. Component and styling rules

- Keep all local shadcn component definitions inside `src/components` (for example, `src/components/ui`). Configure `@/components` to resolve to `src/components`.
- Add shadcn components only into that directory. Application code must import UI components from these local definitions, never from a remote registry, another copied component directory, or a separate shadcn package.
- Pages and layouts may consume these local components; do not define duplicate UI primitives inside route files.
- Prefer existing shadcn components and composition over bespoke components. Avoid custom application components unless an essential layout requirement cannot be expressed reasonably using the available components.
- Keep component styling and variants in the component definitions. Avoid page-level styling, inline styles, CSS modules for individual pages, and duplicated utility-class recipes in route files.
- Any responsive layout styling needed by the pages should be encapsulated in minimal layout components under `/components`, rather than creating a custom design system.
- Global CSS is limited to Tailwind/shadcn setup, theme tokens, and required base styles. It should not contain page-specific presentation.
- Retain default shadcn typography, colors, borders, radii, and control styling wherever practical.
- Do not recreate the reference's illustration, custom logo, textures, decorative gradients, or serif typography.

## 5. Shared presentation

- Simple branding: a Lucide `BookOpen` icon with the name **Next Read**.
- Consistent content widths and spacing supplied by locally defined components.
- Light, basic shadcn presentation; a dark-mode toggle is not part of this iteration.
- No additional navigation system is required.

## 6. Splash page — `/`

- A deliberately sparse page with the application name and a short explanation.
- Suggested copy: “Find your next book based on your Goodreads reading history, ratings, and reviews.”
- The splash page remains public; authenticated app routes require a Supabase session.
- No additional calls to action are required for this iteration.

## 7. Import page — `/app/import`

### Content

- Heading: “Import your Goodreads data”.
- Short explanation of the intended use of Goodreads reading history and ratings.
- Upload-style panel containing an upload icon, CSV instructions, and a “Choose file” button.
- Informational section with export instructions:
  1. Open Goodreads and go to My Books.
  2. Select Import and Export.
  3. Export the library.
  4. Use the downloaded CSV in Next Read.
- External link to `https://www.goodreads.com/review/import`.

### Behavior

- “Choose file” opens a system file picker. Permit any file type; do not validate, read, or parse its contents in the browser.
- After selection, show the filename and an enabled submit action. Submit the file as multipart form data to the App Router endpoint (`POST /api/import`).
- The endpoint parses the Goodreads CSV server-side and stores the import run and its book records in Supabase, then returns the new import ID. The browser does not inspect file contents.
- On success, remain on `/app/import` and set `?importId=…`. When `importId` is present, load that import's saved `imported_books` rows through the authenticated Supabase server client and show a data-backed review. Display total books, rated books, unique authors, a rating distribution, and up to five newest records with valid read dates. Missing values are shown as unavailable; no records show zero/empty values, and query errors show an unavailable state.
- “Import a different file” removes the query and restores the import step. “Continue to recommendations” navigates to `/app/recommendations`.
- Do not read uploaded contents in the browser; records are parsed and persisted server-side.

### Likely shadcn components

`Card`, `Button`, `Alert`, and optionally `Separator`.

## 8. Recommendations page — `/app/recommendations`

### Introduction

- Heading: “Get book recommendations”.
- Brief explanation of the unified recommendation form.
- One responsive form based on `designs/Next Read Finder Recommendations v2.png`.

### Unified recommendation form

- Optional prompt textarea, limited to 500 characters.
- Recommendation count selector: **5, 10, 20**, initially set to **10**.
- Focus selector, initially **Balanced**:
  - Balanced.
  - Similar to my favorite books.
  - Explore something different.
  - Discover new authors.
- Include-genres and exclude-genres multi-selection controls.
- Import selector populated from the signed-in user's `import_runs` metadata, showing filename and upload date. Import records are persisted; the selected import is transient and is not persisted.
- One “Generate recommendations” action.

### Fixed genre options

Use the same small static list for both genre controls:

- Science Fiction
- Fantasy
- Mystery
- Thriller
- Romance
- Historical Fiction
- Literary Fiction
- Nonfiction

Start genre selections empty. Selected genres can be added and removed with standard shadcn composition (for example, `Popover`, `Command`, and `Badge`). Do not allow a genre to be included and excluded simultaneously; selecting it in one control removes it from the other.

### Behavior

- Recommendation controls and the selected import use transient local state; recommendation preferences and the selected import are not persisted.
- The generate button requires a selected import and calls authenticated `POST /api/recommendations`; it is pending-disabled during the request. The experiment is local-development-only; production responds unavailable.
- Import metadata query errors and empty import history show honest unavailable/empty states; do not use placeholder import records.
- Pending button state only; no toasts, generated lists, sample book results, or completion feedback.
- This local experiment processes only the selected import through the bounded Open Library integration, without genre matching or per-book statuses. Authenticated requests persist exact Open Library subject strings and per-book observation counts to private `subject_candidate` via an atomic restricted database operation. The separate private `subject` table is curated and untouched. No AI, search, results UI, promotion automation, or frontend selection change.
- The initial subject-candidate migration has an incremental follow-up migration (`20261027000000_fix_record_subject_candidates_grouping.sql`) correcting the aggregate expression; deployments that already ran the initial migration must apply the follow-up. Unavailable endpoint failures receive only a phase and sanitized database error code in server logs; SQL messages and subject payloads are never logged.
- Refreshing the page resets all controls to their defaults.

### Admin subject candidates — `/app/admin/subjects`

- Direct URL only; no navigation link. Requires trusted `app_metadata.is_admin: true`.
- Read `subject_candidate` through an exact count plus 20-row server-side pages. Default order is occurrences descending then exact subject ascending; sortable Candidate and Occurrences headers use URL-backed ordering, and pagination preserves that ordering. Out-of-range pages redirect to the last page.
- Show a visible range and total, bounded numbered page links with ellipses, and disabled boundary controls. Promoted remains a disabled, unchecked placeholder and implies no membership. No search or write actions.
- Apply migration `20261028000000_enable_admin_subject_candidate_read.sql` for authenticated SELECT protected by admin-only RLS. The curated `subject` table remains private. Set admin through trusted Supabase Auth Admin/API app_metadata, never user_metadata. JWT claim refresh/expiry can delay revocation; never use a service-role key in application code.

### Likely shadcn components

`Card`, `Label`, `Textarea`, `Select`, `Popover`, `Command`, `Badge`, `Button`, and `Separator` where appropriate.

## 9. Responsive design and accessibility

- Support narrow mobile screens through desktop without horizontal page overflow.
- Keep the unified recommendation form usable on narrow mobile screens; preserve comfortable padding and readable control widths.
- Allow selected genre chips and branding to wrap as needed.
- Use semantic headings and visible, programmatically associated input labels.
- Preserve keyboard navigation and visible focus indicators from shadcn.
- Give icon-only genre removal controls accessible names.
- Treat icons next to descriptive text as decorative.
- Ensure all inert action buttons use `type="button"`.
- Do not present the decorative upload region as a functioning keyboard or drag-and-drop input.

## 10. Explicitly out of scope

- Browser-side file-content reading or validation.
- Reading-history review or editing.
- Results pages or sample recommendation results.
- AI integration, broader Open Library integration, and recommendation algorithms.
- Recommendation data integrations.
- Persistence of recommendation preferences, selected import, or other transient application state (import records are persisted as described above).
- Custom branding assets and a bespoke visual design system.
- Recommendation processing outside the explicitly approved local experiment.

## 11. Implementation sequence

1. Scaffold Next.js, TypeScript, and Tailwind using npm and the `src` directory layout.
2. Initialize shadcn with component aliases pointing to `src/components`; add Lucide React.
3. Add only the shadcn primitives needed by the three pages.
4. Establish minimal shared presentation and encapsulated responsive layout styles under `/components`.
5. Build the splash and import pages.
6. Build the unified recommendation form, transient controls, and import metadata selector.
7. Check responsiveness, keyboard interactions, accessibility labels, and inert button behavior.
8. Run available static checks and a production build; record outcomes.

## 12. Acceptance criteria and checks

- `/`, `/app/import`, and `/app/recommendations` load directly.
- Branding consistently reads “Next Read”.
- The splash page explains the application's purpose without introducing a new workflow.
- Import and recommendation pages reflect the reference's content and structure using basic shadcn styling.
- The import stepper and decorative illustration are absent.
- All shadcn definitions reside under `src/components`, and consumers import only those local UI definitions via `@/components`.
- Styling is encapsulated in components, apart from required global setup and theme tokens.
- Unified recommendation controls work locally, import metadata is user-backed, and contradictory genre selections are prevented.
- The import picker accepts arbitrary files; upload posts multipart data and returns the saved import ID.
- Successful import query state fetches and reviews only the selected import's saved records; reset and continue actions work.
- Review summaries and latest reads derive only from saved records; empty and query-error states do not show fabricated data.
- Only the local experiment endpoint is permitted; it must be disabled in production and its console logs removed before deployment.
- Check layouts at representative mobile, tablet, and desktop widths (for example, 375, 768, and 1440 pixels).
- Run TypeScript checking, the scaffold's configured lint command, and a production build. If the scaffold does not provide linting, configure it explicitly rather than assuming `next lint` exists.
- Inspect the browser console for runtime errors and manually test keyboard interaction.

## 13. Further considerations

Confirmed implementation choices:

- Component directory: `src/components`, exposed through `@/components`.
- Package manager: npm.
- Initial recommendation count: **10**.
- Included and excluded genres: initially empty.
- Supabase email/password authentication protects `/app/*`. Import runs and book records are persisted; recommendation preferences and selected import are not persisted.

The fixed genre list and focus options above remain the proposed options; no further decisions are required to begin the scoped implementation.
