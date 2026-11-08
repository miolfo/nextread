# Recommendations engine — approved local experiment

This document records the implemented subject-collection and v1 recommendation phases.

This approved experiment connects Generate to authenticated `POST /api/recommendations` only in local development. It requires the explicitly selected import and reads only that owner's rows using the authenticated, user-scoped Supabase client. No implicit import/history fallback is allowed. Ownership must be checked before book reads; all pages must complete within the 40-second overall deadline or the request fails closed.

Each successful request is also recorded as a new historical set with its import reference, owner, creation time, and ordered Open Library work fields. The set and children are inserted by one authenticated, ownership-checking RPC; storage failures fail the endpoint. Empty successful generations are retained. Import and user deletion cascade to the sets. No uploaded file bytes or recommendation preferences are stored.

## Processing contract

- `my_rating` is stored as a string. Exclude null/blank, non-finite, and values outside inclusive 0..5; fractional values and zero are valid. Shuffle first, then stable numeric descending sort so equal-rating order is random, including at the top-30 boundary. Never use a random sort comparator.
- Take 30 before identifier filtering; do not backfill. Prefer valid ISBN-13, otherwise valid ISBN-10/13 in `isbn`. Remove spaces/hyphens; enforce ISBN length/digits/checksum, uppercase X. Convert ISBN-10 to canonical ISBN-13 for equivalence deduplication. Skip invalid/missing IDs. Select at most ten unique candidates without replacement.
- Send one request to `https://openlibrary.org/api/books?bibkeys=ISBN:...,ISBN:...&format=json&jscmd=data` for the sample only. Share the 40-second overall deadline and enforce a 2 MiB response maximum. Validate JSON and only consume requested keys. Retain all valid nonblank subject strings exactly as returned. Persist aggregated per-book counts to `subject` through the authenticated client's restricted atomic RPC; recording observations does not change `enabled`.
- Successful per-book logs contain only the bounded title and returned subject names. Missing entries or entries without usable subjects are represented with an empty subjects array. No genre matching or per-book status is derived from provider subjects; preferences are not applied. Batch-level diagnostics remain for no eligible ISBN and provider/network outcomes.
- `subject` stores exact source strings, enabled status, and nonnegative observation counts. Observation increments are aggregated once per unique subject per fetched book; there is no normalization or automatic enablement.
- Candidate persistence shares the 40-second overall deadline and requests database cancellation on timeout. A timed-out request may nevertheless have committed; a subsequent retry counts as new observations, not an idempotent replay.

## v1 recommendation phase

This phase uses only the explicitly selected import's existing sample of up to ten books and the subjects fetched for those books during the current request. It does not query globally stored subject counts. Every fetched subject is eligible, regardless of its `enabled` value. For each book, count each exact subject string at most once; aggregate those per-book observations across the current sample. Exact-string aggregation deliberately does not merge case, spelling, or synonym variants.

Transient optional inclusive first-publication-year bounds, selected approximate median-page ranges, and genre include/exclude selections are validated by the API and applied to every search/backfill request. Either year bound can be omitted; reversed bounds are invalid. Empty selections are unrestricted. Genre inclusion matches any selected mapped subject key; exclusion rejects any selected mapped key. Both predicates are independently ANDed outside the personalized subject OR.

Shuffle the aggregated subjects, then apply a stable descending sort by count. This makes equal-count order random, including at the three-subject boundary. Pass at most three raw subjects to search. Search normalizes only the query clauses; exact raw source strings remain the aggregation keys. No frequency-based search boosting is implied.

Search Open Library through `/search.json` with safely escaped exact `subject_key` clauses joined in one OR group and `AND language:eng`. AND genre include/exclude predicates separately outside the personalized subject OR, then add year and median-page filters as explicitly fielded numeric range clauses to the `q` expression; group selected page-length alternatives in one parenthesized OR group. Keep queries simple and bounded to 8 KiB; request 50 candidates per request and at most three requests/150 candidates inside the existing deadline. Relevance omits sorting, Highest rated uses `sort=rating` and `ratings_count:[10 TO *]`, and Random uses `sort=random` in one batch because pagination may be unstable. Request only work title, author names/IDs, year, median pages, ISBN, and cover fields. Exclude imported books by either imported ISBN field or conservative normalized title+author match. Return at most one work per author, treating any shared coauthor as a conflict and skipping candidates without usable identities. If a later backfill request fails, retain already accepted results. Fewer than ten is valid. No subjects means no recommendations.

For v1, emit a local-development completion diagnostic containing only the final result count. Immediately before each search request, development logs include normalized filters, selected subjects, sort, pagination, and exact bounded query URL. Never log recommendation results, credentials, tokens, or import data. These diagnostics are local-development only and are not production observability.

Retain authenticated ownership checks and bounded request/result sizes under a 40-second overall recommendation deadline. Search gets at most 30 seconds beginning when search starts, capped by the remaining overall budget. Enforce these deadlines even when fetch/body promises ignore abort; abort and stream cancellation are best effort and their cleanup is not awaited. Search is one request, only when subjects exist, with no retries. Fail closed when any phase exhausts its budget.

Search failure diagnostics contain only a fixed allowlisted reason (`deadline-exhausted`, `timeout`, `http-error`, `network-error`, `missing-body`, `response-too-large`, `invalid-json`, `invalid-shape`, or `query-too-large`), elapsed milliseconds, the search-start budget in milliseconds, and an optional numeric upstream HTTP status. They never include import data, response content/headers, credentials, or raw errors. Development search diagnostics include bounded normalized filters, selected subjects, sort, pagination, and exact query URL for reproduction; they are never emitted in test or production, and logging exceptions do not affect requests. The endpoint returns the generic `Unavailable` client error.

### References

- [Open Library Search API](https://openlibrary.org/dev/docs/api/search)
- [Open Library Search How-To](https://openlibrary.org/search/howto)

Edition details are intentionally deferred. If needed later, fetch them separately using the selected work's key endpoint; do not request or infer edition data as part of recommendation search.

These references describe OR queries, exact subject-key matching, default relevance, returned fields, and result limits. The three-subject cap, English-edition filter, ten-result candidate bound, and ten-recommendation target above are application decisions, not Open Library service limits. Open Library's subject-key normalization is implemented by [`str_to_key()` in `update_work.py`](https://github.com/internetarchive/openlibrary/blob/9ba92942806d20707dc088dfe596f98f554e1381/openlibrary/solr/update_work.py#L30-L40).

### Acceptance checks

- Counts each exact subject no more than once per book in the current selected sample; disabled subjects remain eligible and stored global counts are not consulted.
- Randomizes ties with shuffle followed by stable descending count sort, and caps the selected list at three including ties at the boundary.
- Safely escapes/encodes normalized subject keys in the OR query, scopes the complete group to English-language editions, and does not add frequency boosting.
- Requests up to 50 candidates per batch, excluding imported works and deduplicating across bounded backfill (three batches/150 candidates, one batch for Random); returns honestly fewer results and none for an empty subject set without fallback.
- Handles provider errors and deadline exhaustion without presenting fabricated results; the 40-second overall budget and search's maximum 30-second sub-budget fail closed on exhaustion without retries.
- Development completion logs contain only a result count; search-request logs contain normalized filters, selected subjects, sort, pagination, and exact bounded URL, never recommendation contents, credentials, or import records.
