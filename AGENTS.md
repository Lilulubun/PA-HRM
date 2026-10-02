# AGENTS — Performance Appraisal PoC

> Repo-specific working contract for Oh My Pi and other coding agents. Root `AGENTS.md` contains product boundaries and safety rules; follow both files.

## Project identity

| Item | Value |
|---|---|
| Project type | Fullstack, single repository |
| Application | Planned Next.js + TypeScript app in repository root |
| Graph service | Planned Neo4j Community, direct tarball installation on CachyOS (Arch-based; no Docker) |
| Development target | Local Linux laptop; not Hermes server |

## Common rules

### Scope and change policy
- Read `planning/prd.md`, root `AGENTS.md`, and `dev-docs/ai/PROJECT_CONTEXT.md` before changing workflow behavior.
- Inspect git status and existing implementation first. Preserve uncommitted user changes.
- Make the smallest change that satisfies an acceptance criterion. Avoid speculative abstractions and unrequested refactors.
- Do not add Paperclip, Orca, Hindsight, an MCP server, or other agent orchestration/memory services to runtime unless the project owner approves a requirement and trade-off.
- Keep dependencies lean. Verify package identity, version, and lockfile effects before adding dependencies.

### Product and data safeguards
- Jev assesses each peer-feedback Answer for relevance/importance; it never changes or deletes feedback. A generative LLM summarizes relevant feedback and preserves exact source quote/Answer IDs; validate quotes as exact substrings before accepting Evidence.
- Jev returns typed classifications, sufficiency judgment, and a draft 1–5 rating proposal. It does not generate prose or rationale. A generative LLM explains the draft using graph-traceable evidence and cites Evidence IDs, including counter-evidence.
- Manager may edit the appraisal-level draft and finalizes once. Without explicit finalization, rating stays draft. Record manager edits/finalization append-only in the employee's logical graph.
- Use one logical Knowledge Graph per employee; MVP stores one employee graph in one Neo4j instance. Keep future employee-centered data extensible, but personality data collection, inference, and use are out of scope.
- Store `Evidence` as a first-class Neo4j node linked to exactly one canonical source `Answer`. Feedback contains Answers; seeded 360° statements each become an Answer. Evidence may have no proposal while pending, rejected, or insufficient.
- Persist submitted answers before model calls. Model failure/retry must not lose source data.
- Derive identity and role only from a server-validated signed session, never client-supplied role/user fields. Authorize every manager mutation against the target appraisal. Hash demo credentials; bind local services to localhost by default.
- Keep synthetic fixture records visibly labeled. Never imply they are actual employee records or a representative sample.
- Treat generative LLM and Jev outputs as untrusted. Validate schemas, retain source inputs, surface uncertainty, and handle model failures without data loss.
- Do not auto-score, rank, promote, compensate, terminate, or recommend PIP.
- Enforce role access server-side. Employee cannot finalize manager rating.
- Never place secrets in tracked files, prompts, logs, fixtures, or screenshots. Use ignored local environment files and safe examples.

### Git policy
- Check `git status` and current branch before changes.
- Use focused commits when asked to commit. Do not force-push or rewrite shared history.
- Do not claim changes are committed/pushed unless verified by git output.

### Testing and verification
- For each non-trivial behavior, add or update a runnable focused test.
- Verify at minimum: full workflow, evidence-to-source trace, support and contradiction, insufficient evidence, invalid/model-unavailable response, role authorization, and idempotent seed.
- At least one documented end-to-end test MUST run the actual Next.js app against the locally installed Neo4j service. Mark mock-only tests clearly; they do not satisfy runtime verification.
- Run relevant tests and report actual commands and results. Distinguish untested assumptions from verified facts.
- Update `dev-docs/ai/PROJECT_CONTEXT.md` only to reflect verified implementation/runtime state; retain uncertainty markers where not verified.

## Backend and frontend rules

- Framework: Next.js + TypeScript (planned; follow actual repo conventions once established).
- Keep authorization, validation, model orchestration, and graph writes on trusted server-side code.
- UI must distinguish AI proposal, manager-confirmed mapping, and final human rating.
- Keep source evidence and final decision visibly traceable in manager workflow.
- Use accessible labels, keyboard-operable controls, clear error/loading/empty states, and avoid relying on color alone.
- Do not duplicate business rules in UI as a substitute for server enforcement.

## README maintenance

Keep repository `README.md` aligned with actual setup, required Node/Neo4j/Java versions, local Neo4j service start/stop, seed/test commands, demo accounts, synthetic-data warning, and known limitations. Never document an unverified command as working.

## Communication to project owner

- Be concise and state assumptions explicitly.
- Report files changed, tests run, observed outcome, and remaining gaps.
- Never describe this prototype as TKT 3-certified or a validated appraisal model without external criteria and evidence.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
