# Recommendations engine — approved local experiment

This approved experiment connects Generate to authenticated `POST /api/recommendations` only in local development. It requires the explicitly selected import and reads only that owner's rows using the authenticated, user-scoped Supabase client. No implicit import/history fallback is allowed. Ownership must be checked before book reads; all pages must complete within the ten-second overall deadline or the request fails closed.

## Processing contract

- `my_rating` is stored as a string. Exclude null/blank, non-finite, and values outside inclusive 0..5; fractional values and zero are valid. Shuffle first, then stable numeric descending sort so equal-rating order is random, including at the top-30 boundary. Never use a random sort comparator.
- Take 30 before identifier filtering; do not backfill. Prefer valid ISBN-13, otherwise valid ISBN-10/13 in `isbn`. Remove spaces/hyphens; enforce ISBN length/digits/checksum, uppercase X. Convert ISBN-10 to canonical ISBN-13 for equivalence deduplication. Skip invalid/missing IDs. Select at most ten unique candidates without replacement.
- Send one request to `https://openlibrary.org/api/books?bibkeys=ISBN:...,ISBN:...&format=json&jscmd=data` for the sample only. This legacy Books API batch supports the selected 10/13 ISBN keys. No other endpoints, retries, cache, redirects, writes or persistence. Ten seconds overall and 2 MiB response maximum. Validate JSON and only consume requested keys; cap subjects at 20 and 100 chars, titles at 200 chars.
- Successful per-book logs contain only the bounded title and returned subject names. Missing entries or entries without usable subjects are represented with an empty subjects array. No genre matching or per-book status is derived from provider subjects; preferences are not applied. Batch-level diagnostics remain for no eligible ISBN and provider/network outcomes.

## Privacy and exclusions

Backend success logs contain bounded titles and provider subjects; batch-level diagnostics may describe provider/network outcomes. Never log credentials, user/import IDs, headers, raw errors, or history dumps. These history-derived interests may be sensitive; local testing assumes the operator's terminal is private and adds no intentional retention, but actual platform logging/access/retention policy is not asserted. Do not expose terminal output. Remove experiment logs and disable the endpoint before deployment. Endpoint returns generic status only and no reading/recommendation data.

No results UI, AI, recommendation search, user-facing outcome feedback, or derived persistence is authorized. Preferences remain transient and do not influence this experiment.
