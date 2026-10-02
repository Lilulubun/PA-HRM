# PROJECT_CONTEXT — Performance Appraisal PoC

> Status: Implementation context updated with observed repository facts. Runtime claims remain marked verified, blocked, or unverified.

## System overview

Local-first prototype for one complete, evidence-traceable 360° performance-appraisal workflow. One employee has one logical Knowledge Graph in one local Neo4j instance. The graph records peer feedback, employee self-review, Evidence, AI proposals, manager actions, and final rating with provenance. It can be extended later as an employee-centered data graph, potentially including personality data; personality data collection, inference, and use are out of scope for this prototype.

Two model roles: Jev makes typed decisions; a generative LLM writes summaries, follow-up questions, and an evidence-grounded explanation. Manager reviews one appraisal-level draft, may edit, then finalizes once. No finalization means draft, not final.

The Knowledge Graph is an application data store for explicit appraisal entities and provenance, not an AI-agent memory provider. `Evidence` is a first-class node linked to one canonical source `Answer` entity. `Feedback` contains one or more Answers; each seeded 360° statement is represented as one Answer. Evidence may have no rubric mapping while pending, rejected, or insufficient. Graph links record proposals or human-confirmed review state; they do not prove claim truth or rating validity.

One logical graph per employee; MVP has one employee graph in one Neo4j instance. Keep employee-scoped structure extensible for potential future personality data, but no collection, inference, storage, or use of personality data in this prototype.

## Project type declaration

| Item | Value |
|---|---|
| Project type | Fullstack single repository (Next.js application plus Neo4j service) |
| Git location | Repository root (current checkout path is environment-specific) |
| Code layout | Next.js app in repository root; no separate backend/frontend repositories observed |

## Planned runtime stack

| Layer | Technology | Status |
|---|---|---|
| Application | Next.js + TypeScript | Implemented; `npm run build` observed passing |
| UI/server endpoints | Next.js App Router | Implemented routes under `app/`; full app/browser E2E unverified |
| Graph database | Neo4j Community 5.26.5 | Running locally on `127.0.0.1`; authenticated seed repeated with stable 27-node/21-relationship counts |
| Local development | Node.js/npm + Neo4j local user service | Neo4j user service configured at `~/.config/systemd/user/neo4j.service`; Java 21 runtime |
| Generative AI | Owner-configured LLM endpoint | Adapter contract and deterministic mock path implemented; real provider contract and quality unverified |
| Typed decision AI | Configured Jev endpoint | Typed proposal path and deterministic mock assertions implemented; real integration and quality unverified |
| Agent orchestration/memory | None in application runtime | Paperclip, Orca, Hindsight excluded from MVP runtime |

## UI/UX template and framework

| Item | Value |
|---|---|
| HTML template provided | No template identified |
| UI framework | To be selected within Next.js implementation; avoid custom CSS framework |
| Screens in MVP | Employee sign-in, self-review/chat, submission status; manager sign-in, appraisal review/evidence trace, final rating |

Do not assume a particular design library or create elaborate styling before workflow is proven.

## Database topology

| Connection | Domain | Notes |
|---|---|---|
| Neo4j local service | Planned source of truth for appraisal, feedback, answers, evidence, proposals, decisions, and ratings | Seed/import must be idempotent. |
| Demo identity/session | Not yet selected | Must use server-validated role-bound sessions; do not store plaintext demo passwords. Select and test session persistence across app restart before implementation. |

## Planned source structure

| Path | Function |
|---|---|
| `app/` | Next.js routes and screens |
| `components/` | Shared UI components, only when needed |
| `lib/` | Graph client, model adapters, validation and workflow logic |
| `graph/` | Constraints, seed/import, and trace queries |
| `data/` | Synthetic fixture files and expected-output cases |
| `tests/` | Unit/integration tests for workflow, roles, provenance, and graph trace |
| `planning/prd.md` | Product requirements and acceptance criteria |
| `AGENTS.md` | Coding-agent working rules for Oh My Pi and other agents |
| `dev-docs/ai/PROJECT_CONTEXT.md` | This planned/current architecture context |

Exact paths may change if implementation chooses a simpler structure. Update this table based on actual files.

## Current architecture direction

Planned local architecture: browser → one Next.js application → Neo4j Community installed directly on the Linux laptop as a local service (no Docker). The application handles demo authentication/authorization, self-review persistence, model adapter calls, evidence validation, graph writes/queries, manager review, and finalization. Neo4j stores connected domain entities and provenance. No microservices, no runtime agent orchestrator, and no memory provider. Exact installation instructions depend on the laptop Linux distribution and remain pending verification.

Jev judges relevance, evidence sufficiency, support/contradiction, and proposes a typed draft rating. A generative LLM summarizes relevant peer feedback, creates at most one self-review-only follow-up if evidence is insufficient, and explains draft rating with Evidence ID citations. Manager may edit and must finalize once. Model outputs remain proposals; failures never alter source feedback/answers.

## Uncertainty markers

- Assumption based on product planning: Oh My Pi will read and follow repository `AGENTS.md`; verify with local Oh My Pi.
- Assumption based on owner statement: LLM and System 1 endpoints can be called; request/response contracts and actual behavior remain unverified.
- Assumption based on planning: Neo4j Community is appropriate for local graph traceability; owner reports CachyOS (Arch-based). Plan direct tarball installation, no Docker; verify the exact Neo4j Community release, Java runtime, startup, idempotent import, and required queries on the laptop before calling setup verified.
- Assumption based on planning: Next.js + TypeScript will be maintainable for future development; confirm through a small vertical slice before expanding scope.
- Not established: Neo4j runtime/seed idempotency, full app E2E, real provider behavior, TKT 3 achievement, model quality, fairness, psychometric validity, production security, or organizational representativeness.
