# PA-HRM

Evidence-traceable performance appraisal prototype.

See [`docs/RUN_GUIDE.md`](docs/RUN_GUIDE.md) for full setup, credentials, commands, and workflow steps.

## Verification status

Verified in this repository:

- `npm run seed` — Neo4j Community 5.26.5 at `bolt://127.0.0.1:7687`; authenticated seed completed twice. Counts stayed at 27 nodes and 21 relationships (`before=27,21`, `after=27,21`).
- Neo4j connectors bind localhost only; user systemd service: `~/.config/systemd/user/neo4j.service`.
- `npm run build` and focused mock checks pass.

Blocked or unverified:

- Full Next.js app/browser E2E is unverified. Real LLM and Jev provider contracts, quality, and network calls are unverified.
- Do not describe mock checks as full workflow or production validation. See [`docs/experiment-report.md`](docs/experiment-report.md).

Do not describe mock checks as full workflow or production validation. See [`docs/experiment-report.md`](docs/experiment-report.md).

## Local demo authentication

Copy `.env.example` to `.env.local`. Set `SESSION_SECRET` to random output from documented command. Generate scrypt password hashes with `hashPassword` in `lib/auth.ts`; place hashes in `DEMO_MANAGER_PASSWORD_HASH` and `DEMO_EMPLOYEE_PASSWORD_HASH`. Do not commit `.env.local` or plaintext passwords. Sign in at `/login`; server validates signed HTTP-only sessions.

## Manager settings and fixture upload

Sign in as manager, then open `/settings`. Save separate LLM and Jev base URLs plus optional model/version. Settings persist in ignored `data/.settings.json`; API keys stay server-side in environment variables and are never returned or logged.

Upload `data/template.csv` through CSV fixture upload. Required headers and `synthetic=true` are validated server-side. Invalid CSV returns row errors and performs zero writes. Valid rows use stable IDs and can be uploaded repeatedly; existing source `Answer` and `Feedback` text is never overwritten. Neo4j must be available; absent Neo4j returns prerequisite error without partial import.

## Commands

```sh
npm install
npm run build
npx tsx lib/ai-evidence.check.ts
npx tsx lib/csv-fixtures.check.ts
npm run dev
`npm run seed` # loads ignored .env.local; Neo4j must be running
```

`npm run dev` and `npm run seed` are available commands. Only build and focused mock checks above have observed passing results in this environment; app/browser E2E remains unverified.
