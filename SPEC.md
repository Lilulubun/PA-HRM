# Spec: Evidence-Traceable Performance Appraisal PoC

## Objective

Build one local-first Next.js + TypeScript application for one synthetic employee appraisal. Employee submits durable self-review answers. Manager inspects immutable synthetic 360° feedback, AI proposals, exact source evidence, supporting and contradicting evidence, then edits and explicitly finalizes one rating.

This is a workflow PoC, not an HRMS, validated appraisal instrument, employment decision system, or TKT certification.

## Capability map

| Module | Responsibility | Depends on |
|---|---|---|
| `foundation` | Next.js app, TypeScript, configuration, Neo4j client, validation, test runner | — |
| `identity` | Hashed demo credentials, signed role-bound sessions, server authorization | `foundation` |
| `graph-seed` | Neo4j constraints, synthetic fixtures, idempotent seed, trace queries | `foundation` |
| `self-review` | Employee chat-like answers and draft/submitted state | `identity`, `graph-seed` |
| `ai-evidence` | Jev typed proposals, LLM summaries, quote validation, Evidence provenance, failure handling | `self-review`, `graph-seed` |
| `manager-review` | Evidence trace view, draft editing, one-time finalization, append-only decisions | `identity`, `ai-evidence` |
| `settings-import` | Manager-only local settings for separate LLM/Jev base URLs and CSV fixture upload with schema explanation | `identity`, `graph-seed` |
| `verification` | Focused tests, actual Next.js + Neo4j E2E run, experiment report, README | all |

Build order: `foundation` → `identity` + `graph-seed` → `self-review` → `settings-import` → `ai-evidence` → `manager-review` → `verification`.

## Tech stack

- Next.js App Router + TypeScript.
- Neo4j Community, installed locally from a verified direct distribution; no Docker.
- Neo4j JavaScript driver.
- Server-side HTTP-only signed cookie sessions.
- Model adapters with typed validation. Mock adapters are allowed for deterministic tests; real provider contracts remain configuration-driven until verified.
- Use existing platform/dependencies first. Add packages only with a documented reason and lockfile review.

## Commands

Commands become authoritative only after implementation verifies them. Expected contract:

```sh
npm install
npm run dev
npm run build
npm test
npm run seed
npm run test:e2e
```

README MUST document verified Node, Java, Neo4j, environment, startup, seed, test, and demo-account commands. No unverified command may be documented as working.

## Project structure

```text
app/                 Next.js routes and screens
components/          Shared UI components only when needed
lib/                 Auth, validation, graph client, model adapters, workflow logic
graph/               Constraints, seed/import, trace queries
data/                Synthetic fixtures and expected-output manifest
tests/                Unit, integration, and runtime workflow tests
tasks/               Approved implementation plan and task list
docs/                Experiment/evidence report and runtime notes
README.md            Verified setup and usage
SPEC.md              This implementation contract
prd.md               Product requirements source
```

Paths MAY change only when resulting structure stays simpler and all docs are updated.

## Model settings

Settings screen MUST expose separate base URL fields:

- `LLM base URL`: generative summary, follow-up, and explanation adapter.
- `Jev base URL`: typed decision adapter.

Each provider MAY have separate model/version fields and local API-key inputs. Secrets MUST be stored only in ignored local configuration or a local secret store; never return keys to the browser after save, log them, or commit them. Saving one provider MUST NOT overwrite the other. Settings are server-side configuration, not client-authorized workflow state. Invalid URL/configuration input fails without changing the previous valid value.

## CSV dummy-data import

Settings screen MUST include manager-authorized CSV upload for adding synthetic graph fixtures. Import MUST validate headers, row types, stable IDs, relationship references, and `synthetic=true` before any graph mutation. Invalid files produce row-level errors and zero writes. Valid imports are idempotent by stable ID and MUST NOT rewrite existing source Answers or peer Feedback.

Initial supported CSV format MUST be documented in the settings UI and `data/README.md`:

```csv
record_type,record_id,employee_id,appraisal_id,reviewer_id,reviewer_type,feedback_id,answer_id,answer_text,competency_id,rating_level,synthetic
feedback,fb-001,employee-001,appraisal-001,reviewer-001,peer,fb-001,answer-001,"Example source statement",competency-problem-solving,,true
```

Required columns: `record_type`, `record_id`, `synthetic`. Feedback rows additionally require stable employee/appraisal/feedback/answer IDs, source text, and reviewer fields. Supported `record_type` values and optional fields MUST be explicit in the template and parser errors. CSV parsing MUST correctly handle quoted commas, escaped quotes, UTF-8, blank lines, and a header-only file. Upload MUST show synthetic-data warning and imported counts.

## Core data contract

- Every fixture has `synthetic=true` and stable IDs.
- One logical graph per employee in one Neo4j instance.
- Every feedback statement is an `Answer` source node.
- Every `Evidence` links to exactly one canonical `Answer`.
- Source feedback and submitted answers are immutable after persistence; generated summaries and proposals never replace source text.
- Quote acceptance requires deterministic substring match against source Answer text.
- Jev proposals store typed result, probabilities, model/version, question-set version, input IDs, timestamp, and validation state. Jev does not produce rationale prose.
- LLM summaries/explanations store cited Evidence IDs and preserve counter-evidence.
- Final manager decision stores actor, timestamp, rubric version, rationale, selected support/counter evidence, and prior/new rating references.
- Draft rating, manager-edited rating, and final rating remain distinguishable.

## Security and authorization

- Role and identity come only from a server-validated signed session.
- Client-supplied role/user IDs are ignored for authorization.
- Every manager mutation checks manager role and target appraisal ownership/scope.
- Employee cannot edit peer feedback or finalize a rating.
- Demo passwords are hashed; secrets never enter tracked files, fixtures, prompts, logs, or screenshots.
- Local services bind to localhost by default.
- AI output is untrusted: validate schemas, preserve source input, surface uncertainty, and retain data on failure.

## Testing strategy

Focused runnable tests MUST cover:

1. Self-review persistence before model calls and draft/submitted state.
2. Exact Evidence → one Answer source trace.
3. Supporting and contradicting evidence coexistence.
4. Insufficient evidence and one self-review-only follow-up limit.
5. Invalid model output and unavailable model without source-data loss.
6. Employee rejection of finalization and manager authorization.
7. One-time finalization and append-only ManagerDecision.
8. Idempotent repeated seed with uniqueness constraints.
9. Full workflow against actual Next.js and local Neo4j, not only mocks.

Mock-only tests MUST be labeled. At least one documented runtime test MUST exercise the real app and Neo4j service.

## Boundaries

### Always

- Preserve user changes.
- Validate all external/model input at trusted server boundaries.
- Persist source answers before model calls.
- Keep source provenance visible.
- Mark synthetic data clearly.
- Run focused verification after each non-trivial behavior.
- Update README and runtime context only with observed facts.

### Ask first

- Product scope changes beyond `prd.md`.
- New runtime service, agent orchestration, memory provider, or external SaaS.
- New dependency when stdlib, Next.js, or existing dependency is sufficient.
- Schema changes that discard or rewrite source data.
- Authentication/session design that changes the signed role-bound contract.

### Never

- Auto-score, rank, promote, compensate, terminate, or recommend PIP.
- Let AI output become a final employment decision.
- Delete/rewrite feedback or source Answers.
- Present insufficient or untraceable evidence as valid support.
- Expose peer feedback in follow-up prompts.
- Trust client role/user fields.
- Commit secrets or claim validation, fairness, production readiness, or TKT certification without evidence.

## Success criteria

- Employee signs in, saves answers, submits self-review, refreshes, and sees persisted status.
- Manager signs in and sees one consolidated appraisal with source feedback, exact quotes, summaries, Jev judgments, draft rating, explanation, support, and contradiction.
- Every accepted Evidence traces through Answer and Feedback to employee/appraisal scope.
- Invalid quotes never create accepted Evidence.
- Insufficient evidence remains visible and permits at most one self-review-only follow-up.
- Manager can edit and finalize once; employee cannot; no finalization leaves status draft.
- Final decision traces to manager, timestamp, rubric anchor, rationale, and selected evidence.
- Repeated seed produces no duplicate fixture records or relationships.
- README and experiment report contain observed commands, outcomes, limitations, and artifact paths.

## Open questions

- Exact Neo4j Community release and Java version require verification on target CachyOS laptop.
- Exact LLM and Jev provider request/response contracts are unverified.
- Final UI component approach remains intentionally open until workflow vertical slice works.
- Demo credentials and session signing secret values must be chosen as local-only examples, never committed secrets.
