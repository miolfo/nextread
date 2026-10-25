# Recommendations design

**Draft, 2026-10-19 — not implementation authorization.** The roadmap is documented, not approved for implementation. `AGENTS.md` and `IMPLEMENTATION_PLAN.md` remain authoritative; their inert-generation/results/integration/persistence scope gates still apply. Obtain explicit approval before changing behavior, dependencies, infrastructure, or scope guidance.

## Baseline and proposed semantics

- Current controls: optional 500-character prompt; counts 5/10/20 (default 10); Balanced, Similar to my favorite books, Explore something different, Discover new authors; optional saved-import selector. Generation is enabled but inert; state is transient.
- Eight mutually exclusive include/exclude genres: Science Fiction, Fantasy, Mystery, Thriller, Romance, Historical Fiction, Literary Fiction, Nonfiction. Selections start empty.
- Authentication/saved imports exist. Retained read-book fields: title, primary/additional authors, ISBN/ISBN13, rating, original publication year, read date. No reviews, shelves, or to-read inputs. Missing/malformed/unrated data is not verified catalog evidence.
- Proposed: selected import only, fully paginated with stable ordering; complete server-side exclusions, bounded representative positive/negative/recent profile. Unrated means unknown. Favorites threshold 4–5 stars and sparse-history fallback need approval.
- Proposed focus: Balanced combines taste/variety without invented popularity; Similar uses favorites; Explore diversifies without relaxing constraints; New authors excludes known primary/additional authors using IDs/normalized names, acknowledging ambiguity. No-import/focus fallbacks remain unresolved; never claim absent personalization.
- Proposed genres: match at least one inclusion; empty means unrestricted. Any evidenced exclusion wins. Approve tested subject mapping and uncertainty policy; missing subjects do not prove absence. Prefer partial/empty results over unsupported guarantees.

## Contracts and boundaries

Target: authenticated, server-only `POST /api/recommendations`. Validate `importId`, `prompt`, `count`, `focus`, `includeGenres`, `excludeGenres`: lengths, enums, bounded arrays, mutual exclusion, ID shape; map current display labels explicitly. Never authorize from client owner IDs. Use safe typed validation/auth/inaccessible-import/quota/timeout/provider errors.

Milestone 1 returns mock acknowledgement, request ID, import-selected flag and row count—not cards. Milestone 2 returns explicitly model-generated, unverified suggestions without fake sources/verification. Milestone 3 returns registry-hydrated cards, supported explanations/links, requested/returned counts, warnings and personalization status. Preferences, selected import and ranked results remain transient; no saved recommendation history/feedback.

## Implementation order and acceptance gates

Approve **each substep** before starting. For every substep: demonstrate the manual checklist, run focused automated tests plus repository checks below, obtain independent review, report limitations, then **stop for user approval**. Mock providers first; any live service evaluation needs separate cost/privacy authorization. Do not pull later capabilities into earlier steps.

### 1. Mock authenticated endpoint: selected import and safe filter logs

**1a — Server.** Validate/authenticate, verify ownership before reads, paginate selected history, return mock status. No providers/dependencies or database writes. First verify actual parent `import_runs` schema/ownership and RLS on it and `imported_books`: tracked migrations lack parent creation; live verification is not established.

- Manual → two owned imports, including multi-page history, produce distinct complete selected-only counts; changed filters appear safely. Missing/foreign imports produce indistinguishable errors; unauthenticated/malformed requests fail. No-import follows approved policy, never silently selects history.
- Automated → ownership-before-read, pagination, validation, no-import, mock contract, safe success/error logs, zero provider calls/writes.
- Log allowlist only: validated focus/count/genre enums, import-selected boolean, row count, non-sensitive request ID. Never raw prompt/history/titles/authors, filename, import/user IDs, credentials, PII or request/provider bodies; include middleware/error paths.

**1b — Controls.** Serialize existing controls; add accessible pending/mock-success/error status and duplicate-submit protection only.

- Manual → direct navigation, import/filter changes and submission match server acknowledgement; prompt stays out of logs, failure recovers, refresh resets state.
- Automated → request mapping, status/error/pending, duplicate protection, genre membership, no invented cards/personalization.

### 2. OpenAI-only bounded-profile recommendations

**2a — Server.** Official OpenAI SDK Responses API plus direct schema dependency; server-configurable, evaluated model. Send bounded history/preferences, retain complete exclusions locally. Validate structured suggestions; conservative ISBN/title-author dedup and approved author rules are best effort, not factual verification. No Open Library, web tools, persistence or writes; no fake sources/confidence/verified claims.

- Manual → mocked adapter receives bounded selected data; repeats across pages are removed; sparse/no-import behavior is honest. Failure returns safe error; shortfalls remain partial/empty. Authorized live results do not establish guaranteed truth.
- Automated → profile bounds, complete exclusions, ambiguity, structured-output validation, focus/genres/fallbacks, injection, failure/budgets, unverified contract, zero retrieval/writes.

**2b — UI.** Accessible transient loading/full/partial/empty/error/retry states, prominent unverified copy, counts/warnings/personalization status.

- Manual → changed requests cannot show stale results; retry works, refresh resets, no source/verified badges.
- Automated → latest-request/duplicate handling, all states, safe rendering, labels/counts, keyboard/status/focus behavior.

### 3. Open Library tools, verified registry, candidate persistence

**3a — Isolated adapters.** Implement bounded search/details/ISBN normalization, no generation integration or writes yet.

- Manual → mocked search/work/edition identities and real source links agree; missing metadata is safe, outage differs from no match; invalid URLs cannot trigger fetching. Live lookups require authorization.
- Automated → fields/descriptions, ISBN/work resolution, conservative identity, SSRF/redirect rejection, payload/rate/retry bounds; no bulk history enrichment or persistence.

**3b — Retrieval/ranking.** Bounded discovery/enrichment feeds a request-scoped eligible candidate/source registry. Rank structured `candidateId, reason, matchedPreferences, sourceIds`; hydrate metadata server-side. Reject unknown/duplicate/ineligible picks and unsupported claims. Source membership alone is not claim support. Reapply read/author/genre exclusions and work dedup; bounded replenishment never pads invalid results. No persistence/web yet.

- Manual → real work identities/supporting links; editions collapse, read books disappear; ambiguity/failure yields warnings/partial results within budgets.
- Automated → registry/provenance, unsupported explanations, exclusions, safe links/covers, budgets/injection/failures, zero writes/web calls.

**3c — Candidate storage.** Approve schema and shared-versus-per-user policy/RLS/retention first. Server-only repository/migrations store normalized bibliographic identifiers, provenance, `fetchedAt`, schema/normalization version, conservative work upsert key; optional run association requires approval. Never store prompts/history/preferences/ranked results in catalog metadata. Reuse requires freshness, identity, provenance and current-request eligibility checks; rebuild registry each request.

- Manual → inspect sanitized rows; repeat calls reuse fresh metadata without edition duplicates; stale rows refetch/withhold, another user's exclusions still apply, unauthorized access fails. Refresh clears UI, not approved catalog rows.
- Automated → real test-database constraints/RLS, repository round trips, concurrent upserts, freshness/version/access/exclusion checks. Mocks alone cannot prove RLS.
- Document migration ordering, retention and disable-write/reuse rollback; rehearse in disposable database. No destructive production rollback without approval.

**Increment 4 deferred:** separately propose/approve hosted `web_search` only after milestones 1–3. Preserve actual source records/citations; verify claim support and provider compatibility. Any non-Open-Library bibliographic fallback needs explicit credibility/identity policy.

## Retrieval and operational constraints

- `search_books`: `https://openlibrary.org/search.json`; explicit fields `key,title,author_name,author_key,first_publish_year,cover_i,subject,isbn,edition_key`.
- `get_book_details`: `https://openlibrary.org/works/{id}.json`; normalize string/object descriptions. `lookup_book_by_isbn`: `https://openlibrary.org/isbn/{isbn}.json`; validate ISBN, selectively resolve edition/work links—not every history row.
- Prefer work identity; normalized ISBN/conservative title-author fallback must preserve translations/anthology ambiguity. Covers: `https://covers.openlibrary.org/b/id/{coverId}-M.jpg?default=false`, validated IDs and accessible fallback. Defer experimental Subjects API; avoid legacy `/api/books`.
- Allowlisted IDs/origins, bounded arguments/payloads; validate redirects/provider links against SSRF. All prompts/imports/retrieved content are untrusted data, never executable instructions; safe text/URL rendering only.
- Revalidate Open Library guidance: identified contact-bearing User-Agent/registration; published limits were 1 request/second unidentified, 3 identified. Shared cross-instance limiter, metadata cache/coalescing/freshness bounds; never shared-cache private history/prompts.
- Server-only secrets/auth; durable per-user quota/concurrency and aggregate rate enforcement. Bound turns/calls/tokens/bytes/candidates/retries/time, including replenishment; timeouts/backoff/cancellation release leases. Prompt instructions/process-local counters are insufficient. Confirm SDK controls, tool/structured-output compatibility and deployment timeouts; separate discovery/ranking if needed. Background infrastructure needs approval.
- Minimize/disclose provider history and search terms. `store: false` where applicable is **not zero retention**; verify provider/deployment policies before privacy promises. Logs remain sanitized.

## Files, verification, decisions

Likely files: `src/app/api/recommendations/route.ts`; `src/lib/recommendations/` (contracts/profile/registry/orchestration/candidate repository); `src/lib/open-library/`; `supabase/migrations/`; recommendation controls/results components; `proxy.ts` auth-refresh matcher (not authorization). Follow `AGENTS.md` UI conventions: composition-only routes, component styling, Base UI, preserved genre `aria-checked` versus highlight `aria-selected`.

After application changes, report every result:

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

UI substeps also require browser checks at 375/768/1440px, keyboard/status/focus and console checks; no configured E2E runner exists.

Resolve blocking decisions per increment: optional-import/exclusion scope; favorites/new-author sparse/no-import fallbacks; genre mapping/strictness/uncertainty; model/API compatibility and bounded costs; hosting/shared infrastructure; privacy disclosure/live schema/RLS; candidate ownership/upsert/freshness/retention/run association; absent-catalog rejection versus separately approved fallback. Proposed defaults are not approvals.

## Sources

Researched 2026-10-19; revalidate capabilities, limits, citations and privacy before implementation:

- [Open Library APIs/usage](https://openlibrary.org/developers/api), [Search](https://openlibrary.org/dev/docs/api/search), [Covers](https://openlibrary.org/dev/docs/api/covers)
- [Legacy Books API](https://openlibrary.org/dev/docs/api/books), [experimental Subjects](https://openlibrary.org/dev/docs/api/subjects)
- [OpenAI web search](https://platform.openai.com/docs/guides/tools-web-search)
