# Feature 6.2.2 performance audit

Measured on 18 August 2026 in the supplied development container.

## Before

The legacy manager load issued two unpaginated task-list requests (`status_ne=cancelled`
and `status=cancelled`) plus clients, task types, and filter metadata. The list query
selected descriptions, payment fields, and attachment URLs before fetching every
matching row. Pagination, filtering, and sorting then happened in React.

Runtime timings were not available because neither the Vite application nor the API /
MySQL service was running in the supplied container. A direct probe of port 5173
returned connection status `000` in `0.000419s`; a probe of port 80 returned status
`000` in `0.000301s`. Consequently, no TTFB or usable-table time is reported rather
than substituting estimated values.

## After

The initial workspace now requests one lightweight page (10 rows by default), one
aggregate summary, and independently cached lookup metadata. The page request applies
filters and an allow-listed sort before `LIMIT`/`OFFSET`; its response includes total
and page metadata. Descriptions, payment data, and attachment paths are omitted from
list rows and fetched only after the details drawer opens. Candidate lookup is limited
to 20 rows and scoped by company.

Runtime TTFB, payload bytes, and usable-table timing remain unreported for the same
service-availability limitation above. The response row ceiling is verifiably 10 for
the default page and 100 for the largest selectable page. Only one task-list call is
created by the initial manager-page effect; summary query identity excludes page.

## SQL review

The previous per-row correlated attachment lookup was replaced by one grouped
attachment subquery. List and count operations share filter predicates; the count
selects only `COUNT(DISTINCT t.id)` and does not retrieve row payloads. No index was
added because a live database was unavailable for a trustworthy `EXPLAIN`; adding an
unverified index would violate the feature's index-review requirement.
