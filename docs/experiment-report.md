# Experiment report

Status: PoC verification snapshot. Results separate deterministic mock checks from blocked runtime checks. No full E2E result claimed.

## Environment and commands

Observed commands:

| Command | Status | Observation |
|---|---|---|
| `npm run seed` twice | Verified | Neo4j Community 5.26.5 authenticated on `bolt://127.0.0.1:7687`; counts remained 27 nodes and 21 relationships before/mid/after. |
| `npm run build` | Verified | Next.js production build passes. |
| `npx tsx lib/ai-evidence.check.ts` | Verified, mock-only | Focused assertions pass. |
| `npx tsx lib/csv-fixtures.check.ts` | Verified, mock-only | CSV parser assertions pass. |

Runtime setup: localhost-only Neo4j connectors, Java 21, user service `~/.config/systemd/user/neo4j.service`. Rotated password stored only in ignored `.env.local` (mode 600).

## Required cases

| Case | Status | Evidence or gap |
|---|---|---|
| Self-review persistence and draft/submitted state | Blocked/unverified | Requires running app and Neo4j-backed persistence; no app E2E run. |
| Exact Evidence → one Answer source trace | Mock-only verified | `lib/ai-evidence.check.ts` validates accepted evidence path and source quote checks; Neo4j trace remains unverified. |
| Supporting and contradicting evidence coexistence | Blocked/unverified | No real graph/app run; not claimed from mock checks. |
| Insufficient evidence and one follow-up limit | Mock-only verified | Focused assertion covers insufficient Jev result and follow-up limit. |
| Invalid model output and unavailable model without source-data loss | Partly mock-only verified | Invalid Jev output and invalid LLM quote are asserted; unavailable real provider and persistence-preservation path remain unverified. |
| Employee rejection of finalization and manager authorization | Blocked/unverified | Requires app/session E2E; not run. |
| One-time finalization and append-only ManagerDecision | Blocked/unverified | Requires Neo4j-backed manager workflow; not run. |
| Idempotent repeated seed and uniqueness constraints | Blocked | Seed could not connect to Neo4j. |
| Full workflow against actual Next.js and local Neo4j | Blocked | Neo4j unavailable; browser/app E2E not run. |
| CSV schema/parser behavior | Mock-only verified | Focused assertion covers quoted CSV fields. Neo4j import and zero-write behavior remain unverified. |

## Provider and security gaps

Real LLM and Jev endpoint contracts, authentication, response quality, latency, and failure behavior remain unverified. No provider secrets were used or recorded. This report does not establish fairness, psychometric validity, production security, employment-decision readiness, or TKT certification.

## Next verification

Install and start local Neo4j, configure local-only environment secrets, run seed twice, then exercise employee and manager flows through the running Next.js app. Record outputs and failures here; do not convert blocked rows to verified without observed results.
