# Implementation Plan

## Constraints

- Smallest vertical slices. No UI polish before workflow proof.
- No real model dependency in first slice. Use typed adapters with deterministic fixtures/tests.
- Neo4j remains source of truth for appraisal entities and provenance.
- Every task keeps source records durable before model work.

## Dependency order

### 1. Foundation

Create Next.js App Router TypeScript project in repository root. Add scripts, environment example, strict TypeScript, test runner, Neo4j driver, basic health route, and README skeleton. Verify install, build, and dev server.

Checkpoint: app starts locally; build passes; no secrets tracked.

### 2. Graph seed

Create Neo4j constraints and stable synthetic fixture manifest. Implement idempotent seed for one employee, one manager, four reviewers, eight feedback records, Answers, one competency, five anchors, and expected support/contradiction/irrelevant/duplicate/insufficient cases. Add trace queries.

Checkpoint: seed twice; counts and relationships remain stable; trace query returns source Answer for Evidence.

### 3. Identity

Implement hashed demo credentials and signed HTTP-only role-bound sessions. Add server-side authorization helpers. Add login/logout routes and role-protected route behavior.

Checkpoint: valid sessions persist; invalid credentials fail; employee cannot call manager mutation; client role fields do not change authorization.

### 4. Settings and CSV import

Add manager-authorized settings screen with separate LLM and Jev base URLs, optional model/version fields, secret-safe local persistence, validation, and masked status. Add synthetic CSV template/help text and multipart upload. Parse quoted CSV with escaped quotes, validate headers/types/IDs/references/`synthetic=true`, reject invalid files with row-level errors and zero graph writes, and import valid rows idempotently without rewriting existing source Answers or Feedback.

Checkpoint: saving LLM settings does not change Jev settings; invalid URL and invalid CSV preserve prior state; valid CSV imports expected fixture counts on repeated upload.

### 5. Self-review

Implement employee self-review screen/API. Persist each Answer before any model adapter invocation. Support draft and submitted status, refresh persistence, and immutable submitted source records.

Checkpoint: focused tests prove durable save, status transitions, and model-failure source preservation.

### 6. Evidence workflow

Implement adapter interfaces and schema validation. Add Jev relevance/sufficiency/support/contradiction/rating proposal persistence. Add LLM summary and explanation validation. Reject invalid quote drafts; preserve raw inputs and failures. Add one bounded self-review-only follow-up.

Checkpoint: tests cover exact quote, invalid output, unavailable model, conflicts, insufficient evidence, and provenance.

### 7. Manager review

Implement manager appraisal page with source feedback, exact quotes, summaries, typed judgments, draft rating, explanation, counter-evidence, and trace links. Add server-authorized draft edit and one-time finalization. Persist append-only ManagerDecision and distinguish AI draft from human final value.

Checkpoint: manager happy path passes; employee and repeated finalization fail; final trace query returns actor, timestamp, rubric, rationale, and evidence.

### 8. Runtime verification and docs

Run actual Next.js app against locally installed Neo4j. Add E2E workflow, experiment/evidence report, verified README commands, CSV documentation, and update PROJECT_CONTEXT.md from planned to observed facts only.

Checkpoint: documented full workflow and all PRD verification cases pass or are explicitly reported with observed gaps.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Neo4j version/runtime unavailable | Keep graph code explicit; verify local install before claiming E2E; provide clear prerequisite failure |
| Provider contracts unverified | Isolate adapters; deterministic mock fixtures; never conflate mock proof with real-provider proof |
| Evidence provenance drift | Enforce one Answer source relation and quote substring validation at write boundary |
| Authorization bypass | Server derives actor from session and checks appraisal scope on every mutation |
| Scope expansion | Implement only PRD entities and one employee graph; reject unrelated HRMS features |
| UI complexity hides workflow bugs | Build accessible functional screens with minimal styling first |

## Task list

- [ ] T1: Scaffold Next.js + TypeScript + scripts + environment example + README skeleton
- [ ] T2: Add Neo4j client, constraints, fixture manifest, idempotent seed, and trace queries
- [ ] T3: Add hashed demo auth, signed sessions, login/logout, and authorization tests
- [ ] T4: Add self-review answer persistence, draft/submitted state, and employee screen
- [ ] T5: Add validated Jev/LLM adapters, Evidence provenance, quote checks, and failure paths
- [ ] T6: Add manager review, edit, one-time finalization, and append-only decisions
- [ ] T7: Add full runtime E2E, experiment report, verified README, and PROJECT_CONTEXT update

Each task MUST include focused tests and must not silently alter product boundaries.
