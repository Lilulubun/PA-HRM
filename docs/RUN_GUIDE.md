# PA-HRM — Quick Start Guide

Local-first evidence-traceable performance appraisal PoC. One app, one graph, one employee.

---

## 1. Prerequisites

| Requirement | Check | Status |
|---|---|---|
| Node.js ≥ 20.9 | `node -v` | Verified |
| OpenJDK 21 (for Neo4j) | `java -version` | Verified — 21.0.12 |
| Neo4j Community 5.26.5 tarball | `$HOME/.local/neo4j/current/bin/neo4j status` | Installed |
| Neo4j user systemd service | `systemctl --user is-active neo4j` | Verified active |

Java install (requires sudo, one-time):

```sh
sudo pacman -S --needed jdk21-openjdk
```

## 2. Neo4j setup

Installed at `~/.local/neo4j/current` (community 5.26.5, from `https://dist.neo4j.org/neo4j-community-5.26.5-unix.tar.gz`).

Start/stop/status:

```sh
systemctl --user start neo4j     # start (enabled at login)
systemctl --user stop neo4j      # stop
systemctl --user status neo4j    # status
```

Ports (localhost only):

| Port | Use |
|---|---|
| 7687 | Bolt (app driver connects here) |
| 7474 | Neo4j Browser (web UI) |

Auth: credentials live in `.env.local` (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`). The user `neo4j` / Browser at http://localhost:7474 uses the same password from `.env.local`.

Unit file (already configured, if broken download again):

```text
~/.config/systemd/user/neo4j.service
Type=exec + ExecStart=.../bin/neo4j console + TimeoutStartSec=180
```

## 3. Application defaults

`.env.local` (gitignored, mode 600) contains:

| Key | Purpose |
|---|---|
| `NEO4J_URI` | `bolt://127.0.0.1:7687` |
| `NEO4J_USER` | `neo4j` |
| `NEO4J_PASSWORD` | Rotated random secret (never printed) |
| `SESSION_SECRET` | HMAC session signing secret |
| `DEMO_MANAGER_PASSWORD_HASH` | scrypt (`scheme:salt:digest`) |
| `DEMO_EMPLOYEE_PASSWORD_HASH` | scrypt (`scheme:salt:digest`) |

## 4. Demo accounts

Local-only. Server-backed signed HTTP-only cookie sessions.

| User id | Role | Password |
|---|---|---|
| `manager-001` | manager | `manager-demo` |
| `employee-001` | employee | `employee-demo` |

## 5. Run the app

From repo root (`~/code/PA-HRM`):

```sh
npm install           # one-time
npm run seed          # idempotent synthetic graph (27 nodes / 21 rels, stable on re-run)
npm run dev           # http://localhost:3000 — loads .env.local
```

Production-ish run: `npm run build && npm start` (same `.env.local`).

Screens:

| URL | Role |
|---|---|
| `/login` | both |
| `/self-review` | employee |
| `/settings` | manager (LLM/Jev base URLs + CSV upload) |
| `/manager-review` | manager (trace, edit draft, finalize once) |

## 6. Workflow

1. Start Neo4j, run `npm run seed` (repeat-safe).
2. Employee logs in → `/self-review` → save drafts → submit (locks answers; further edits fail with explicit `Answer already submitted`, HTTP 409).
3. Manager logs in → `/settings`:
   - Save LLM base URL (partial save merges; invalid URL rejected without overwriting).
   - Save Jev base URL (independent, verified; both must be set together eventually).
   - Save LLM API key and Jev API key (password fields; stored server-side in `data/.settings.json` mode 600, never returned to the browser — only "configured" booleans).
   - CSV upload: valid `data/template.csv` imports idempotently; invalid headers → 422 + row errors + zero writes.
4. Manager opens `/manager-review` → clicks **Run AI evidence pass** → Jev assesses each answer and the LLM extracts verbatim-quote `Evidence` nodes into the graph; the trace list below fills in.
5. Manager edits draft rating/rationale, finalizes once (repeat rejected). Final graph trace: manager, timestamp, rubric anchor, rationale, support/counter evidence ids.

## 7. Commands and verification status

```sh
npm run build                       # verified PASS
npm run dev                         # verified running, /api/health returns {"status":"ok"}
npm run seed                        # verified idempotent (27 nodes, 21 rels after two runs)
npx tsx lib/csv-fixtures.check.ts   # verified PASS
npx tsx lib/ai-evidence.check.ts    # verified PASS
```

Verified in-browser/HTTP smoke tests already run:

- Seed idempotency: PASS (counts stable).
- Manager login/save draft/finalize once /repeat-fail: PASS.
- Employee cannot reach manager settings/api: PASS (403).
- Employee finalize attempt forbidden: returns 400/`FORBIDDEN` (explicit status refinement pending).
- Submitted-answer lock: PASS (409 with clear message).
- CSV invalid/repeat: PASS (422 errors / idempotent import).

Not yet verified (see `docs/experiment-report.md`):

- Full browser-level E2E; only curl-level route smoke tests ran.
- Full graph edge listing per PRD (`HAS_APPRAISAL`, `HAS_FEEDBACK→ABOUT`, `ANCHOR_FOR`, `HAS_RATING`, `MADE_DECISION`, `FINALIZES`-to-`Rating`).
- Evidence enrichment on manager trace (requires running AI workflow then re-seeding).

## 8. Keys and data sources

- Synthetic fixture definitions: `data/fixtures.ts`.
- Seed logic: `graph/seed.ts`.
- Trace queries: `graph/trace.ts`.
- Settings implementation: `lib/settings.ts`, stored at `data/.settings.json`.
- CSV parser: `lib/csv-fixtures.ts`; template/help: `data/template.csv`, `data/README.md`.
- Self-review: `lib/self-review.ts`.
- AI adapters: `lib/ai-evidence.ts`.
- Manager logic: `lib/manager-review.ts`.
- Auth: `lib/auth.ts`.

## 9. Known limitations

- AI outputs remain deterministic mock adapters until real provider verification.
- Evidence trace is populated from graph, so until AI workflow runs it appears empty even after draft/finalize.
- Not production HRMS; no real employee data; not a validated appraisal product; no psychometric claims.
