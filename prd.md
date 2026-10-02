# Product Requirements Document — Evidence-Traceable Performance Appraisal PoC

> Status: Draft for local prototype development. This document defines a narrow PoC, not a validated appraisal product or a TKT certification.

## 1. Product vision

### Elevator pitch
A local-first performance appraisal prototype lets one employee submit a self-review, uses AI to draft traceable evidence and propose mappings to one rubric, and lets a manager review the evidence and set the final rating. A Knowledge Graph stores explicit provenance links among employee, feedback, evidence, rubric, and final decision.

### Problem statement
A conversational appraisal workflow can obscure which source statements support a proposed competency mapping. This PoC tests whether a reviewer can inspect a manager-facing result and trace each evidence item to its source and rubric context before setting a rating.

### Target users

| Role | Use | Need |
|---|---|---|
| Employee | Demo account | Submit self-review answers and see submission status |
| Manager | Demo account | Inspect self-review and seeded 360° feedback, review AI proposals, set final rating |
| 360° reviewer | Synthetic seeded identity only; no login/UI | Supply contextual feedback records for graph and test cases |

## 2. Scope and assumptions

### MVP scope
- One local app, one appraisal period, one target employee, one manager, one competency: `problem solving`.
- Store one logical Knowledge Graph per employee. MVP has one employee graph in one Neo4j instance; use employee-scoped relationships/IDs so future employee-centered data (e.g. personality data) can be considered without collecting, inferring, or using it in this PoC.
- Two demo accounts with local authentication: demo credentials are hashed, role-bound sessions are signed/validated server-side, manager mutations authorize against the target appraisal, and client-supplied role/user IDs are never trusted. No email, SSO, or production identity provider.
- Employee completes a chat-like self-review flow. Answers remain saved as source records.
- Seeded peer 360° feedback remains immutable/read-only. Jev assesses each feedback item for relevance/importance; it never deletes or rewrites feedback.
- A generative LLM summarizes only the feedback items Jev marks relevant, preserving exact source quote/Answer IDs. Exact quote must be a substring of source Answer; otherwise evidence is invalid.
- Jev uses typed `Choice`, `Noul`, and/or `Score` questions to classify relevant/contradictory evidence, assess sufficiency, and propose a draft 1–5 rubric rating. Store raw typed output, probabilities, model/version and question-set version; no model-generated rationale is attributed to Jev.
- A generative LLM explains draft rating from graph-traceable evidence and Jev outputs; every material claim links to evidence IDs and counter-evidence remains visible.
- Manager reviews a single appraisal-level draft, may edit it, and finalizes once. Without manager finalization, status stays draft; no implicit final rating.
- Follow-up, only when evidence is insufficient, asks employee using self-review answers and rubric only; it must not expose or quote peer feedback. Limit to one follow-up round.
- Neo4j Community is installed and runs as a local Linux service; Docker is not required. Seed/import is repeatable and idempotent.
- Model the Knowledge Graph as one logical graph per employee. For this PoC, implement one employee graph in one Neo4j instance; do not create separate database instances. Keep the structure extensible for future employee-centered data such as personality data, but personality data collection, inference, and use are explicitly out of MVP scope.
- Seed fixture: 1 employee, 1 manager, 4 synthetic reviewers, 8 feedback records (1 self-review plus 7 360°), source Answers, and deterministic expected evidence/mapping cases; one competency and five rating anchors. Include support, contradiction, irrelevant, duplicate, and insufficient-evidence cases. Seeded expected evidence is test oracle/context, not the employee's live AI output. These fixture counts are test data sizing only, not organizational representation.
- Provide a reproducible local developer setup, README, seed command, automated tests, and a short experiment/evidence report.

### Explicit non-goals
- Full HRMS, appraisal-cycle administration, multi-tenant production deployment, integrations with HRIS, email, or calendar.
- Reviewer login or reviewer-facing UI; collection of real 360° feedback.
- Automated final scoring, employee ranking, promotion, compensation, termination, or PIP recommendations.
- Claiming that the example rubric, 1–5 scale, AI model, or System 1 is psychometrically validated, fair, accurate, or suitable for employment decisions.
- Hindsight, agent memory, Paperclip, Orca, MCP, multi-agent orchestration, or external graph/memory SaaS in the runtime architecture.
- Claiming TKT 3 is achieved. The prototype can gather evidence relevant to assessment; level determination requires applicable official criteria and assessor review.

## 3. User stories and acceptance criteria

### Epic A — Employee self-review

| ID | User story | Priority | Acceptance criteria |
|---|---|---:|---|
| US-01 | As employee or manager, I want to sign in to my demo account so only permitted workflow actions are available. | P0 | Server validates a signed role-bound session; identity/role comes only from that session; every manager mutation checks role and target appraisal server-side. Demo credentials are hashed, shown/documented as local-only, and never accepted from client-supplied role/user fields. |
| US-02 | As employee, I want to answer appraisal prompts conversationally so I can submit self-review evidence. | P0 | Answers are persisted with stable IDs and appraisal/employee linkage; refresh does not lose saved answers. |
| US-03 | As employee, I want submission status to be clear. | P1 | UI distinguishes draft and submitted; submitted answers cannot be silently overwritten by AI processing. |

### Epic B — Evidence drafting and Knowledge Graph

| ID | User story | Priority | Acceptance criteria |
|---|---|---:|---|
| US-04 | As manager, I want relevant peer feedback summarized without losing source traceability. | P0 | Jev relevance proposal is stored; every Evidence links to one source Answer; quote must exact-match source text; summary links to quote/source; original feedback remains immutable. |
| US-05 | As manager, I want typed Jev judgments for evidence and a draft rating. | P0 | Store relevance, sufficiency, support/contradiction, and rating judgments as validated typed outputs with probabilities/model/question-set version; no fabricated rationale; model failure creates no confirmed proposal. |
| US-06 | As manager, I want to inspect evidence relationships in context. | P0 | Graph query/view traces Employee → Feedback/Answer → Evidence → Jev proposal → draft Rating and final ManagerDecision; support/contradiction remains visible. Evidence is first-class, not a text property or memory record. |
| US-07 | As manager, I want insufficient or conflicting evidence surfaced. | P0 | Conflicts remain visible; insufficient evidence triggers at most one self-review-only follow-up; no rating proposal is presented as usable if sufficiency judgment is insufficient. |
| US-08 | As developer, I want to re-run seed/import safely. | P0 | Re-running seed creates no duplicate nodes/relationships; stable IDs and uniqueness constraints enforce this. |

### Epic C — Manager review and final decision

| ID | User story | Priority | Acceptance criteria |
|---|---|---:|---|
| US-09 | As manager, I want to review a consolidated appraisal draft. | P0 | Manager sees source feedback, quotes, summaries, Jev probabilities/judgments, draft rating, LLM explanation, and counter-evidence in one view; peer feedback is read-only. |
| US-10 | As manager, I want to edit and finalize the appraisal once. | P0 | Manager can edit proposed rating/rationale and performs one explicit finalization action; absent finalization remains draft. |
| US-11 | As manager, I want final decisions traceable to their evidence. | P0 | Final Rating and append-only ManagerDecision link to manager actor, timestamp, rubric version, rationale, and selected supporting/counter Evidence. |

### Epic D — PoC verification

| ID | User story | Priority | Acceptance criteria |
|---|---|---:|---|
| US-12 | As evaluator, I want to see an end-to-end workflow and test results. | P0 | README provides local startup/seed/test commands; experiment report lists cases, expected outcomes, observed outcomes, limitations, and evidence artifacts. |
| US-13 | As developer, I want AI calls replaceable/configurable without changing appraisal semantics. | P1 | LLM and System 1 calls are isolated behind small adapters; configured credentials are not committed or printed; failure paths preserve data and permit manager review. |

## 4. Workflow

1. Start Neo4j locally and run idempotent seed for one employee graph.
2. Employee signs in and submits self-review; persist `Answer` before any model call.
3. For each peer feedback `Answer`, Jev returns typed relevance/importance judgments. Store each proposal and probabilities; never alter or delete source feedback.
4. Generative LLM summarizes relevant feedback only. Validate every quoted passage against its exact source `Answer`; invalid quotes produce invalid drafts, not evidence.
5. Store first-class `Evidence` linked to one source `Answer`, with quote, summary, source type, model/proposal provenance, and validation state.
6. Jev evaluates the appraisal evidence package in one request with independent typed questions for evidence sufficiency, support/contradiction, and provisional rubric rating 1–5. Preserve per-item reviewer/source labels; do not average per-reviewer ratings.
7. If evidence is insufficient, generative LLM creates one follow-up question using employee self-review and rubric only. Persist response as new `Answer`, then re-run analysis once; peer feedback is never exposed in follow-up.
8. Generative LLM explains Jev's draft using only graph-stored evidence and proposal outputs. Every material claim references evidence IDs; show counter-evidence. Do not attribute rationale to Jev.
9. Manager reviews the appraisal-level draft, may edit, then finalizes once. No finalization means appraisal remains draft. Store append-only manager decision, actor, timestamp, edited/final rating, rationale, rubric version, and selected evidence links in the employee graph.

## 5. Data and Knowledge Graph requirements

### Graph entities

- `Employee`: synthetic employee identity.
- `Manager`: synthetic manager identity; may share a base `Person` label if implementation stays simpler, but authorization role is stored separately.
- `Reviewer`: synthetic reviewer identity and reviewer category.
- `Appraisal`: employee, period, workflow status.
- `Feedback`: source record for self-review or seeded 360° item; period, reviewer type, synthetic marker, timestamps.
- `Answer`: first-class source entity for every employee chat response and every seeded 360° feedback statement, linked to its containing `Feedback`. This is the canonical source unit for evidence extraction.
- `Evidence`: first-class entity with stable ID, extracted statement, extraction status, provenance, and created time. Each Evidence links to exactly one source `Answer`; it may have zero rubric proposals while pending, rejected, or insufficient.
- `Competency`: `problem solving` in this prototype.
- `RubricAnchor`: versioned anchor for rating levels 1–5; illustrative placeholder language.
- `JevProposal`: immutable typed decision record with stable ID, target Answer/Evidence/Appraisal IDs, question-set version, Jev model/version, typed answer payload and probabilities, timestamp, and validation status. It may record relevance, support/contradiction, sufficiency, or draft rating.
- `Summary`: generative-LLM output tied to exact source Evidence/Answer IDs, exact-match quote validation result, model/version, timestamp, and draft/accepted/rejected state; it never replaces source feedback.
- `ManagerDecision`: append-only manager edit/finalization event with actor, timestamp, changed fields, rationale, and prior/new draft references.
- `Rating`: Jev-proposed draft rating and manager-edited/final rating state, rubric version, rationale, and timestamps; keep AI proposal distinct from manager-final value.

### Minimum relationships

```text
(Employee)-[:HAS_APPRAISAL]->(Appraisal)
(Appraisal)-[:HAS_FEEDBACK]->(Feedback)
(Employee)-[:SUBMITTED]->(Feedback) // self-review only
(Reviewer)-[:PROVIDED]->(Feedback) // seeded peer feedback
(Feedback)-[:CONTAINS]->(Answer)
(Answer)-[:SOURCE_FOR]->(Evidence)
(Evidence)-[:HAS_SUMMARY]->(Summary)
(Answer|Evidence|Appraisal)-[:HAS_JEV_PROPOSAL]->(JevProposal)
(RubricAnchor)-[:ANCHOR_FOR]->(Competency)
(JevProposal)-[:PROPOSES_ANCHOR]->(RubricAnchor)
(Rating)-[:RATED_AGAINST]->(RubricAnchor)
(Rating)-[:SUPPORTED_BY|COUNTERED_BY]->(Evidence)
(Appraisal)-[:HAS_RATING]->(Rating)
(Manager)-[:MADE_DECISION]->(ManagerDecision)
(Appraisal)-[:HAS_DECISION]->(ManagerDecision)
(ManagerDecision)-[:REVISES|FINALIZES]->(Rating)
```

`Feedback` may contain several `Answer` nodes; each peer feedback statement is kept as its own source Answer. Each Evidence links to exactly one source Answer and never merges different reviewers. Evidence may include an exact-match quote and a separately stored generative-LLM summary; quote validation is deterministic substring matching against the source Answer. JevProposal records typed outputs, probabilities, model/version, question-set version, input IDs, timestamp, and validation status; Jev does not provide prose rationale. ManagerDecision is append-only and records edits/finalization in the employee's graph, linked to manager actor and appraisal/rating. AI draft and final manager rating remain distinct. Seed/import and repeated request IDs must be idempotent; intentional model reruns use a new run ID.

### Provenance and data rules
- Every fixture record is explicitly marked `synthetic=true`.
- Use stable fixture IDs. Import uses `MERGE`/uniqueness constraints or equivalent idempotent semantics.
- Store source type, source Answer ID, employee/appraisal scope, reviewer category, rubric version, AI proposal/decision state, model/question-set versions, and timestamps.
- Preserve original peer feedback as immutable source data separately from generated quote/summary and model judgments. Do not delete low-relevance feedback or replace source text with a summary.
- Each Evidence links to exactly one Answer; summary claims must link to Evidence IDs. Keep support and counter-evidence distinct and visible.
- Graph relationships represent recorded statements/proposals/decisions; they do not prove factual correctness, personality, or rating validity.

### Seed fixture coverage
At minimum: one clear supporting item, one counter-evidence item, one unrelated item, one duplicate/near-duplicate, and one insufficient-evidence case. Include multiple synthetic reviewer perspectives, but do not portray fixture volume as representative. Store expected outcomes in a fixture manifest with stable IDs, case labels, expected Evidence source IDs, expected proposal status/anchor/classification, and expected manager action; tests must use this manifest rather than inferred text matching.

## 6. Rubric and decision rules

- Competency: `problem solving`.
- Rating anchors: levels 1–5, each with explicit illustrative wording authored for this fixture.
- The 1–5 scale and wording are placeholders for workflow testing, not a validated instrument.
- Jev may classify each feedback item and propose a draft rating on the placeholder 1–5 scale; generative LLM may summarize relevant feedback and explain the draft using cited Evidence IDs.
- Jev `Score` always returns a scale position; separately assess evidence sufficiency. If insufficient, do not present its score as a usable rating; allow one bounded self-review-only follow-up, then present insufficient evidence if still unresolved.
- Manager may edit the appraisal-level draft and rationale, then must explicitly finalize once. Without finalization, the appraisal remains draft.
- Do not average individual reviewer scores. Preserve source labels and show supporting/counter evidence; manager’s final selection/rationale is recorded separately from model outputs.
- If evidence is absent, ambiguous, conflicting, or cannot be traced to source, flag it; never invent supporting evidence.

## 7. Constraints and assumptions

### Constraints
- Development and runtime target: local Linux laptop, reported 16 GB RAM; Docker is unavailable and not required. Verify installed Node.js, Java, and available disk before implementation; target distro is CachyOS (Arch-based).
- Developer onboarding target: install/start Neo4j Community as a local Linux service once, then clone/copy the project, run `npm install`, and `npm run dev`; exact commands and required Node/Neo4j/Java versions must be verified against selected dependencies and laptop distribution.
- Neo4j Community runs directly on the laptop; Docker is not required. The app runs locally. Hermes server (2 CPU / 2 GB RAM) is not a runtime dependency and must not host the development database.
- Keep architecture to one application and one graph database service. No agent orchestrator or memory provider in runtime.
- External LLM and System 1 calls are assumed available by project owner; actual provider contract, response schema, latency, reliability, and output quality remain unverified until integration tests.

### Assumptions to validate
- Oh My Pi can work with repository instructions in `AGENTS.md`; verify on the local installation.
- Selected model endpoints can produce structured output usable for evidence drafts and mapping proposals; validate with actual endpoint contract and tests.
- Neo4j local resource use is acceptable on the 16 GB Linux laptop; verify startup and a seed/query cycle.
- Applicable TKT Software indicators and hackathon assessment checklist will be obtained and mapped to test evidence before making any TKT claim.

## 8. Success criteria and experiment evidence

### Product success (PoC, not TKT certification)
- Employee can submit self-review; saved source remains intact through model success/failure.
- AI-generated Evidence is stored as graph entity and traced to exactly one source Answer, then traversable through Feedback to employee/reviewer and appraisal.
- Manager can inspect synthetic 360° context and graph links, including SUPPORTS and CONTRADICTS.
- Manager alone can finalize a rating; final Rating traces to rubric anchor and selected evidence.
- Insufficient/conflicting evidence is surfaced without forced score.
- Seed is repeatable without duplicates; key graph trace queries return expected relationships.
- Local setup, end-to-end flow, and automated tests run using documented commands.

### Experimental report
Record test-case ID, fixture IDs, expected result, observed result, pass/fail, model/system version where available, and artifact path. Include at least:
1. Happy-path full workflow.
2. Evidence sufficiently linked to source.
3. Evidence insufficient.
4. Supporting and contradicting evidence coexist.
5. Unrelated/duplicate evidence does not silently become confirmed support.
6. Invalid model output and model unavailable.
7. Employee cannot finalize; manager can.
8. Repeated seed/import does not duplicate graph records.
9. Final rating trace query returns manager, timestamp, rubric anchor, rationale, and linked evidence.

Report sample counts and failures. Do not use a single successful demo as a model-accuracy claim. Do not claim TKT 3, fairness, validity, or organizational readiness from this PRD or synthetic fixture alone.

## 9. Out of scope / later options
- Production authentication, deployment, multi-user isolation, real employee data, consent and retention policies.
- Large-scale benchmark, psychometric validation, bias/fairness study, or employment outcome evaluation.
- Hindsight/agent memory as a graph backend. It may be evaluated separately only if persistent conversational memory becomes a product requirement; it is not the source of truth for appraisal evidence.
- Paperclip/Orca multi-agent orchestration. Reconsider only if multiple coding agents and review workflows become an actual development bottleneck.
- Alternative graph SaaS or PostgreSQL graph extensions until the local Neo4j traceability workflow is verified and a concrete requirement justifies migration.
