# Recommendations engine — approved local experiment

This document records the implemented subject-collection and v1 recommendation phases.

This approved experiment connects Generate to authenticated `POST /api/recommendations` only in local development. It requires the explicitly selected import and reads only that owner's rows using the authenticated, user-scoped Supabase client. No implicit import/history fallback is allowed. Ownership must be checked before book reads; all pages must complete within the 40-second overall deadline or the request fails closed.

## Processing contract

- `my_rating` is stored as a string. Exclude null/blank, non-finite, and values outside inclusive 0..5; fractional values and zero are valid. Shuffle first, then stable numeric descending sort so equal-rating order is random, including at the top-30 boundary. Never use a random sort comparator.
- Take 30 before identifier filtering; do not backfill. Prefer valid ISBN-13, otherwise valid ISBN-10/13 in `isbn`. Remove spaces/hyphens; enforce ISBN length/digits/checksum, uppercase X. Convert ISBN-10 to canonical ISBN-13 for equivalence deduplication. Skip invalid/missing IDs. Select at most ten unique candidates without replacement.
- Send one request to `https://openlibrary.org/api/books?bibkeys=ISBN:...,ISBN:...&format=json&jscmd=data` for the sample only. Share the 40-second overall deadline and enforce a 2 MiB response maximum. Validate JSON and only consume requested keys. Retain all valid nonblank subject strings exactly as returned. Persist aggregated per-book counts to `subject` through the authenticated client's restricted atomic RPC; recording observations does not change `enabled`.
- Successful per-book logs contain only the bounded title and returned subject names. Missing entries or entries without usable subjects are represented with an empty subjects array. No genre matching or per-book status is derived from provider subjects; preferences are not applied. Batch-level diagnostics remain for no eligible ISBN and provider/network outcomes.
- `subject` stores exact source strings, enabled status, and nonnegative observation counts. Observation increments are aggregated once per unique subject per fetched book; there is no normalization or automatic enablement.
- Candidate persistence shares the 40-second overall deadline and requests database cancellation on timeout. A timed-out request may nevertheless have committed; a subsequent retry counts as new observations, not an idempotent replay.

## v1 recommendation phase

This phase uses only the explicitly selected import's existing sample of up to ten books and the subjects fetched for those books during the current request. It does not query globally stored subject counts. Every fetched subject is eligible, regardless of its `enabled` value. For each book, count each exact subject string at most once; aggregate those per-book observations across the current sample. Exact-string aggregation deliberately does not merge case, spelling, or synonym variants.

Shuffle the aggregated subjects, then apply a stable descending sort by count. This makes equal-count order random, including at the three-subject boundary. Pass at most three raw subjects to search. Search normalizes only the query clauses; exact raw source strings remain the aggregation keys. No frequency-based search boosting is implied.

Search Open Library through `/search.json`, using safely escaped and URL-encoded exact `subject_key` clauses joined inside one parenthesized OR group, followed by `AND language:eng`. Normalize each clause using Open Library's `str_to_key()` algorithm (lowercase, spaces to underscores, and drop `;/?:@&=+$,<>#%\"{}|\\^[]` and line breaks); collapse normalized-key collisions in the query. This requires a work to have an English edition, not an English work title. Relevance omits sorting parameters, Highest rated uses `sort=rating` with `ratings_count:[10 TO *]`, and Random uses `sort=random`. Bound the query URL to 8 KiB and request at most ten candidates; validate no more than ten response documents. Request only work-level title, author, year, ISBN, and cover fields; disregard any edition data in provider responses. Keep ISBN exclusion based on work-level ISBN arrays. Exclude already imported books when reliable identifiers permit. Return fewer than ten when exclusions or deduplication leave fewer usable distinct results; do not request more candidates to backfill. When there are no subjects, return no recommendations rather than unrelated fallback results. The count is fixed at ten and disabled; include/exclude genre controls are disabled and not applied.

For v1, emit a local-development diagnostic to the server console containing a pretty-printed JSON representation of the final filtered and deduplicated recommendations. This is the same array returned by the response, after excluding books already present in the explicitly selected import wherever ISBNs permit and removing duplicate works. Sanitize and bound the metadata before logging; never log credentials, tokens, or the user's import data. This diagnostic is for local development and must not be treated as production observability.

Retain authenticated ownership checks and bounded request/result sizes under a 40-second overall recommendation deadline. Search gets at most 30 seconds beginning when search starts, capped by the remaining overall budget. Enforce these deadlines even when fetch/body promises ignore abort; abort and stream cancellation are best effort and their cleanup is not awaited. Search is one request, only when subjects exist, with no retries. Fail closed when any phase exhausts its budget.

Search failure diagnostics contain only a fixed allowlisted reason (`deadline-exhausted`, `timeout`, `http-error`, `network-error`, `missing-body`, `response-too-large`, `invalid-json`, `invalid-shape`, or `query-too-large`), elapsed milliseconds, the search-start budget in milliseconds, and an optional numeric upstream HTTP status. They never include request URLs/queries, subjects, ISBNs, import data, response content/headers, credentials, or raw errors. Separately, immediately before the search fetch, development mode logs the exact bounded request URL (including the selected subjects) to aid timeout reproduction; this URL diagnostic is never emitted in test or production, and a logging exception does not affect the request. The endpoint returns the generic `Unavailable` client error.

### References

- [Open Library Search API](https://openlibrary.org/dev/docs/api/search)
- [Open Library Search How-To](https://openlibrary.org/search/howto)

Edition details are intentionally deferred. If needed later, fetch them separately using the selected work's key endpoint; do not request or infer edition data as part of recommendation search.

These references describe OR queries, exact subject-key matching, default relevance, returned fields, and result limits. The three-subject cap, English-edition filter, ten-result candidate bound, and ten-recommendation target above are application decisions, not Open Library service limits. Open Library's subject-key normalization is implemented by [`str_to_key()` in `update_work.py`](https://github.com/internetarchive/openlibrary/blob/9ba92942806d20707dc088dfe596f98f554e1381/openlibrary/solr/update_work.py#L30-L40).

### Acceptance checks

- Counts each exact subject no more than once per book in the current selected sample; disabled subjects remain eligible and stored global counts are not consulted.
- Randomizes ties with shuffle followed by stable descending count sort, and caps the selected list at three including ties at the boundary.
- Safely escapes/encodes normalized subject keys in the OR query, scopes the complete group to English-language editions, and does not add frequency boosting.
- Requests and validates at most ten candidate search results; excludes imports where identifiers permit; deduplicates recommendations; returns honestly fewer results without backfill, and returns none for an empty subject set without fallback.
- Handles provider errors and deadline exhaustion without presenting fabricated results; the 40-second overall budget and search's maximum 30-second sub-budget fail closed on exhaustion without retries.
- Pretty-prints only bounded, validated filtered/deduplicated recommendations in local development, matching the response and excluding selected-import books where ISBNs permit, with no credentials or user import data in logs.
