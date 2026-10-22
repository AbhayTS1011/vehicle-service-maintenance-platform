# Phase 12 — Polish & Deployment Readiness

## Status and working acceptance checklist

`PLAN.md` assigns five tasks to Phase 12 but does not enumerate their individual acceptance criteria. This working checklist interprets the approved “Polish & Deployment” scope and project success criteria without changing the plan:

| Work item | Current result | Evidence / remaining work |
|---|---|---|
| UI polish and responsive use | **In progress** | Shared focus styles, small-screen layout and a truthful prototype landing-page message are implemented. Playwright checks 360, 390 and 768 pixel widths. This is a focused smoke check, not a full-page accessibility audit. |
| Reliability and performance | **Partially assessed** | Gate D reran the production build and selected route/browser checks. No performance benchmark or broad optimization was performed. |
| Security and runtime configuration | **Partially improved; release blocked** | Release Gate E consolidated JWT verification on `jose` and added required claim validation. Gates A/B/E verified persisted authentication and owner-scoped vehicle behavior on the guarded local test DB. Password-hash strengthening, login throttling assessment, and external deployment security review remain. |
| Documentation and operator guidance | **Prepared** | This guide and the project status/README document current boundaries, target architecture, setup, safety, smoke, and rollback steps. |
| Deployment and database readiness | **Local baseline implemented and validated; external readiness not verified** | The guarded create-only baseline initialized a separate disposable local PostgreSQL database. No provider/account, hosted database, credentials, deployment, or external database has been configured or tested. |

Phase 12 remains **IN PROGRESS**. A successful local build is not a deployment or production-readiness result.

## Release blockers and safe audience

Do not publish this application for customer use or place real customer data in it yet:

- User lookup/create call Prisma, registration assigns only CUSTOMER, login verifies stored password hashes, and successful registration/login establish a signed HTTP-only `apex_session`; the focused guarded PostgreSQL Release Gate A integration test passed 1/1.
- Vehicle CRUD is PostgreSQL-backed and owner-scoped. The guarded Release Gate B integration test passed 1/1, including two-customer cross-access checks and booking-history delete protection. The limited browser suite does not exercise database-backed vehicle CRUD.
- `database/baseline.sql` provides a guarded, transactional, create-only bootstrap for an empty database. It passed fresh-target PostgreSQL validation on an isolated disposable local database; external deployment suitability remains unverified.
- No production/external database, live SMTP, or hosted runtime has been verified.

The committed JWT fallback is no longer accepted for production operations. `lib/auth/jwt-secret.ts` requires a configured `JWT_SECRET` with at least 32 characters when `NODE_ENV=production`; use a cryptographically random value stored in the hosting provider's secret manager. Never use the development fallback in a deployment.

## Recommended target (not configured)

For a later controlled demo, use **Vercel's Next.js Node.js deployment with a separate managed PostgreSQL database** that supports TLS and a connection mode compatible with Prisma. This matches the App Router/server-action application and keeps the database separate from the web runtime. It is a recommendation only: no account/provider compatibility, network access, pricing, credentials, or deployment was checked. Select a database vendor only after verifying its connection limits, TLS requirements, backups, regions, and Prisma connection pooling behavior.

The local reviewed baseline is complete, but it does not establish compatibility with an existing or hosted database. Until a non-production hosting target, schema adoption/migration procedure, runtime security review, and deployment checks are approved and verified, keep any preview private and use synthetic data only. Do not connect a preview deployment to production data.

## Environment and build configuration

Set secrets in the hosting provider's server-side environment settings. Do not add values to Git, client-exposed `NEXT_PUBLIC_*` variables, or deployment logs.

| Variable | Requirement |
|---|---|
| `DATABASE_URL` | Required for PostgreSQL-backed application features. Use the selected database's TLS-enabled Prisma connection string; use a pooler only after verifying compatibility and limits. |
| `JWT_SECRET` | Required at runtime in production; at least 32 characters, generated randomly and stored as a secret. The application now fails closed for token signing if missing or too short. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Required for configured SMTP delivery. `SMTP_SECURE` is optional (`true`/`false`). Configure only after a provider and sender are approved. SMTP delivery is best-effort after database commits; there is no outbox or automatic retry. |

`.env.example` contains placeholders only. For local work, copy it to an ignored `.env.local` and set values locally; never paste the real file into issues or commits. The guarded test variable `PHASE5_TEST_DATABASE_URL` is only for the dedicated integration-test target and must never contain a production URL.

Current Node scripts are `npm run db:generate`, `npm run build`, and `npm run start`. A deployment build should generate Prisma Client before compiling:

```sh
npm ci
npm run db:generate
npm run build
npm run start
```

For a Vercel project, use `npm ci` for dependency installation and set the build command to `npm run db:generate && npm run build`. The hosting platform supplies the Node.js runtime and invokes its Next.js adapter; do not enable static export because the application uses server-rendered pages, Server Actions, cookies, and PostgreSQL. No deployment configuration or hosting behavior has been validated in this repository yet.

## Database initialization and migration safety

`database/schema.sql` contains create-only table/type definitions. The normal new-database path is `database/baseline.sql`, which calls the current schema, functions, triggers, views, and indexes inside one transaction. It checks for non-system schemas and user relations, types, and routines before doing any DDL; it refuses any non-empty or partially initialized target. `database/reset.sql` contains the destructive `DROP ... CASCADE` developer reset and is only for disposable local development. **Never run `database/reset.sql` against any shared, hosted, production, or valuable database.**

There is no general-purpose migration runner. Three historical forward-only files remain under `database/migrations/`; they were not tracked by a ledger. The current initial baseline already includes their current schema outcome (the two booking enum additions and structured service-center scheduling), so do not apply those historical migrations after the baseline. `database/baseline.sql` records `20261020_001` in `public.schema_migrations` only after all DDL succeeds. PostgreSQL supports the baseline's DDL and these ordinary index creations inside the encompassing transaction; no concurrent index operation or other known non-transactional DDL is used.

### Safe fresh-database procedure

Use only a new database provisioned specifically for initialization. Verify the host/endpoint and database identity from the provider or local container configuration, and run the identity query before applying anything. Do not decide that a target is safe from its database name alone.

PowerShell example (the value is used by `psql`; do not echo or log it):

```powershell
psql -X -v ON_ERROR_STOP=1 "$env:DATABASE_URL" -c "SELECT current_database(), current_user, inet_server_addr(), inet_server_port();"
# Compare that result with the separately verified target endpoint and database.
psql -X -v ON_ERROR_STOP=1 "$env:DATABASE_URL" -f database/baseline.sql
psql -X -v ON_ERROR_STOP=1 "$env:DATABASE_URL" -c "SELECT version, description, installed_at FROM public.schema_migrations ORDER BY version;"
```

Expected result: the target identity matches the newly provisioned database, baseline application finishes with `COMMIT`, and the ledger contains exactly `20261020_001` for this first install. Verify required objects with read-only catalog queries (tables/types/constraints/indexes, `calculate_invoice_totals(integer)`, `deduct_part_inventory()`, the inventory trigger and timestamp triggers, and the three `vw_*` views). The baseline does not insert sample users, vehicles, bookings, or inventory. Do not point the application at a target until the owner has reviewed the output.

If preflight rejects the target, stop. Do not delete objects or retry with weaker checks. A database with existing data, unknown objects, or a partial install needs a separate owner-approved inventory, backup, and reviewed forward migration/adoption plan; the baseline intentionally cannot auto-adopt it.

### Future forward migrations

Treat each migration as immutable after it is recorded. Add a newly named, forward-only SQL file; review its preconditions and effects; begin a transaction; require the expected preceding version in `schema_migrations`; apply only additive/transformative DDL and data changes that are safe for the target; insert the new version row as the final statement; and commit. Apply one migration at a time with `psql -X -v ON_ERROR_STOP=1` and verify both the ledger and resulting objects. Never edit an already-applied migration or infer that an older database is current from a matching database name. The historical three files have no ledger entries, so existing databases require an explicit reconciliation before using this proposed tracking convention.

The baseline was initialized on 2026-10-20 against `vehicle_service_baseline_test`, a separate database created inside the repository's loopback-only, no-volume local PostgreSQL Compose container. The target name, role, endpoint configuration, and initial public relation count were checked before DDL. The baseline completed and recorded `20261020_001`; read-only queries confirmed 15 tables including the ledger, 3 views, all 3 enums/14 enum labels, the invoice function, inventory function, and 10 triggers. A transaction containing synthetic service/part rows verified invoice totals (subtotal 120.00, tax 21.60, total 141.60) and inventory deduction (3 to 1), then rolled back.

The guard was also run against a populated baseline target and a separate database containing only a partial marker table; both were rejected before baseline writes. A temporary test copy injected a SQL failure after DDL and the ledger insert; psql exited nonzero and a catalog query confirmed zero public relations, types, or routines remained, demonstrating transactional rollback. The temporary injected-failure file resides only in the disposable test container. The original populated `vehicle_service_test` database was not modified. This is local disposable-database evidence only; no production or external database migration was performed for Phase 12.

## Smoke checks

After a private preview is approved and uses synthetic data only:

1. Confirm the deployment's build completed and inspect route logs for startup/configuration errors without printing environment values.
2. Request `/` and `/login`; expect the prototype home and sign-in form to render.
3. Request `/dashboard` without a session; expect a redirect to `/login`.
4. Check one permitted role route with an approved synthetic test account. Existing Playwright coverage uses synthetic JWT cookies and an unreachable database; it is not a deployment smoke test.
5. Check the hosting provider's database connectivity/read-only health tooling, then manually exercise an approved synthetic booking workflow after production authentication hardening and the database rollout plan are reviewed.
6. Confirm an email with a designated non-customer test mailbox only after SMTP is configured and live delivery is explicitly approved.

There is no dedicated application health endpoint today. A route response alone does not establish database readiness.

## Phase 12 verification record

Checks run in the local Windows workspace for this pass:

- `npm run test:unit:phase12`: **3 passed, 0 failed**.
- `npx tsx --test lib/auth/jwt-secret.test.cjs lib/auth/jwt.test.cjs`: **8 passed, 0 failed** (includes the existing JWT regression tests).
- `npm run test:unit:phase11`: **19 passed, 0 failed**.
- Combined unit/mock/regression command documented in `PROJECT_STATUS.md` Section 3G, with the new JWT-secret test added: **209 passed, 0 failed**.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.4.0. The sandbox initially denied creation of Next's temporary Prisma junction; the permission-enabled local rerun passed.
- `npm run test:e2e`: **9 passed, 0 failed** in Chromium. The two new checks verify no horizontal overflow at 360/390/768 pixels and visible keyboard focus on the login email control. The existing seven tests remain limited to route/session handling and safe data-load errors with a deliberately unreachable DB URL.
- Release-blocker auth action tests: `npx tsx --test lib/auth/actions.test.cjs lib/auth/registration-input.test.cjs lib/auth/password.test.cjs lib/auth/jwt.test.cjs lib/auth/jwt-secret.test.cjs`: **21 passed, 0 failed**. `npm run test:unit:phase11`: **22 passed, 0 failed** after adding registration/login session, logout, and duplicate-registration coverage. Both suites mock the repository/cookie boundary and do not establish PostgreSQL persistence.
- `npx tsc --noEmit`: passed when rerun sequentially after the production build generated `.next/types`.
- `npm run lint`: passed.
- `npm run build`: passed using the permission-enabled local workspace. The initial restricted attempt was denied permission to create Next.js's Prisma junction; no build-code change was needed.
- `npm run test:e2e`: **9 passed, 0 failed** after an elevated local retry. The restricted attempt could not create the Prisma junction. Browser tests use synthetic JWTs and an intentionally unreachable database; no persisted auth or database-backed vehicle journey was tested.
- `git diff --check`: passed with LF-to-CRLF conversion warnings only.
- `npm audit --omit=dev`: could not refresh because `registry.npmjs.org` DNS resolution failed (`ENOTFOUND`). The latest historical Phase 11 audit result remains 0 production findings and 5 high development findings; it is not a fresh Phase 12 audit. Full audit was not rerun because registry access was unavailable.
- PostgreSQL integration suites were not rerun; no production/external database was accessed. No live SMTP check was performed.
- A guarded authentication PostgreSQL integration test now exists as `npm run test:integration:phase12`. Its attempted run stopped before connecting/writing because `PHASE5_TEST_DATABASE_URL` was unset. For a safe rerun, follow the PowerShell configuration steps in [docs/phase-5-postgres-test-setup.md](phase-5-postgres-test-setup.md) to start/check only the dedicated loopback test service and set `PHASE5_TEST_DATABASE_URL`, then run `npm run test:integration:phase12`. The suite verifies database identity and requires the dedicated test DB to be empty before writes; it only cleans up the account and registration audit row created by its unique run ID. Do not reset or reinitialize the database.
- A local production-server HTTP smoke was attempted, but the server process could not be reached from the separate restricted shell (HTTP client returned connection refused). Production-server route behavior remains unverified.

The earlier statement above that PostgreSQL authentication integration was not run records the initial Release Gate A attempt; it was blocked by the restricted shell's local-port access and was superseded by the successful permission-enabled run below. Phase 5–10 integration results remain prior evidence and were not rerun for Release Gate B.

### Release Gates A and B — verified local test-database results (2026-10-20)

The repository-documented Compose service was present, healthy, and bound only to `127.0.0.1:55432`. Integration tests used the shared explicit target guard, which accepts only `vehicle_service_test` as `vehicle_service_test` on that loopback endpoint. The authentication suite's empty-database preflight passed; it ran before the vehicle suite. The vehicle suite used unique run-tagged fixtures, checked database name/user and required table before writes, and removed only users/vehicles/service center/service type created by its run. No schema bootstrap or reset was run.

- `npm run test:integration:phase12`: **1 passed, 0 failed** (persisted customer registration, password hash, fresh user lookup, signed session, login, logout cookie clearing).
- `npm run test:integration:phase12:vehicles`: **1 passed, 0 failed** (persisted create, fresh read, owner-scoped list, update, delete; customer A could not read, update, or delete customer B's vehicle; duplicate plate was rejected; a vehicle with booking history could not be deleted).
- `npm run test:unit:phase12`: **8 passed, 0 failed**.
- Combined unit/mock/regression command: **217 passed, 0 failed** (the exact command is in `PROJECT_STATUS.md`, Section 3H). PostgreSQL suites were run separately and are not included in this count.
- `npx tsc --noEmit`: passed; `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.4.0, including compilation, type checks, static generation, and optimization. The first restricted run was blocked creating the Prisma junction; the permission-enabled retry passed.
- `npm run test:e2e`: **9 passed, 0 failed**. Tests use synthetic test-only sessions and an intentionally unreachable database, so they do not verify login persistence or browser-driven database CRUD. The first restricted run failed before tests on the same junction permission; the permitted rerun passed.
- `git diff --check`: passed with Git LF-to-CRLF warnings only.
- The restricted shell's first PostgreSQL attempt could not reach the healthy local test container; the permission-enabled reruns above passed. No production/external database, deployment, or live SMTP was tested. No audit was refreshed in this increment; retain the prior audit record as historical evidence only.

Phase 3 vehicle management is complete within its tested scope. The Gate D and Gate E records below supersede earlier “not rerun” and blocked-environment notes where applicable. Phase 12 remains **IN PROGRESS**: production/external database and hosted deployment verification, remaining password-hashing/runtime security review, broad accessibility review, and measured performance assessment remain outstanding. Live SMTP is also untested as a Phase 9 limitation.

### Release Gate D — deployment-readiness review (2026-10-20)

The working tree was reviewed on branch `main`, HEAD `22bc09b` (`test: complete phase 11 quality assurance`). Existing uncommitted Gate A–C work and untracked `AGENTS.md` were preserved. No application changes, staging, commit, push, reset, or cleanup occurred. Integration suites used the guarded loopback `vehicle_service_test` database with current-process environment variables only; its identity was verified read-only and its application tables were empty before integration. The separate baseline initialization target was not rerun. No production/external database was contacted.

- `npm run test:database:baseline:static`: **3 passed, 0 failed** (static source/safety wiring, not database execution).
- `npm run test:unit:phase11`: **22 passed, 0 failed**; `npm run test:unit:phase12`: **8 passed, 0 failed**.
- Combined unit/mock/regression suite: **217 passed, 0 failed**.
- `npm run test:integration:phase12`: **1 passed, 0 failed** (persisted customer registration, forced CUSTOMER role despite a supplied ADMIN role, stored password hash/fresh lookup, signed session, login, and logout cookie clearing). Duplicate-registration handling was covered by mocked/unit tests, not this PostgreSQL scenario.
- `npm run test:integration:phase12:vehicles`: **1 passed, 0 failed** (persisted CRUD, owner-scoped listing, cross-customer read/update/delete denial, duplicate plate handling, and booking-history deletion protection).
- `npm run test:integration:phase11`: six suites, **23 passed, 0 failed**: Phase 5 5/5, Phase 6 4/4, Phase 7 6/6, Phase 8 4/4, Phase 9 3/3, Phase 10 1/1. Together with the two Gate A/B suites, Gate D ran eight guarded PostgreSQL suites with 25 passing results. Suites use their documented fixture cleanup. No reset, seed, baseline, or schema initialization ran against the populated integration target.
- `npx tsc --noEmit`: passed; `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.4.0, including compilation, type checks, static generation, and optimization. A restricted attempt failed to create Next's temporary Prisma junction due to Windows permissions; the permission-enabled rerun passed without code changes.
- `npm run test:e2e`: **9 passed, 0 failed** in Chromium. Coverage includes protected route access, safe data-load error rendering with an unreachable database, home-page overflow at 360/390/768 px, and visible login focus. Sessions are synthetic and test-only; these tests do not establish persisted browser login, booking writes, browser-based customer isolation, or full database-backed journeys.
- Both `npm audit --omit=dev` and `npm audit` were blocked retrieving current advisories by `getaddrinfo ENOTFOUND registry.npmjs.org`; these are not fresh results. Installed-tree inspection still shows `eslint-config-next@16.4.0 → @next/eslint-plugin-next@16.4.0 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`. The latest historical audit (2026-10-20 before Gate D) reported 0 production findings and 5 high development dependency findings. No downgrade or override was applied.
- `git diff --check`: passed; LF-to-CRLF conversion warnings only.

### Gate D findings at that checkpoint (JWT finding superseded by Gate E)

- **Authentication (historical Gate D finding):** At Gate D, `lib/auth/session.ts` had a separate hand-written HMAC parser and did not require/validate complete claims. Gate E below replaced that verifier with the shared `jose` verification path and tests. Logout still cannot revoke a copied stateless token before expiration. Duplicate-registration handling has mocked/unit coverage only; no password reset flow or login rate limiter was found in the reviewed application code.
- **Password storage:** `lib/auth/password.ts` and the legacy session module use synchronous PBKDF2-HMAC-SHA512 with 10,000 iterations. Benchmark and migrate to an appropriately stronger asynchronous password hashing configuration before production, with a safe existing-hash migration path.
- **Database:** Gate C's user-reported evidence is confined to a separate disposable local empty database and was not rerun here. The baseline rejects populated/partial targets and wraps DDL plus the ledger in a transaction. Normal setup documents only the create-only baseline after independently verifying a new empty target; the destructive `database/reset.sql` and optional `database/seed.sql` are not part of normal setup. No general-purpose migration runner exists; older migrations lack ledger entries. Existing hosted databases need a separately reviewed adoption/forward migration plan. SQL CHECK constraints are not mirrored in Prisma; redundant unique indexes and the malformed non-runtime analytics example remain known issues.
- **UI/performance:** Responsive evidence is limited to the landing page at three widths and a visible login focus indicator. Selected routes have loading, empty, and safe error states, but broad route/state and accessibility coverage is incomplete. No performance measurements or load benchmarks were run; no optimization claim is made. Data tables use horizontal overflow containers where needed.
- **Audit/deployment:** The current registry audit is blocked; treat the five-high development finding as historical outstanding evidence, not a current audit snapshot. Vercel plus managed PostgreSQL remains a recommendation only. Hosting/runtime, TLS/pooling, external schema adoption, backup/restore, rollback, production smoke behavior, and live SMTP remain unverified.

**Gate D release decision (superseded in part by Gate E): Phase 12 remained IN PROGRESS and was not production-ready.** Gate E resolved the JWT verifier discrepancy. Password-hashing review, login throttling assessment, a refreshed audit when registry access returns, and a reviewed non-production hosting/database adoption and smoke/rollback process remain before any controlled deployment. Full responsive/accessibility review and measured performance assessment also remain open. No deployment was initiated.

### Release Gate E — JWT and session security remediation (2026-10-20)

Gate E consolidated server-side JWT verification on the shared `jose` implementation in `lib/auth/jwt.ts`, replacing the separate custom HMAC parser in `lib/auth/session.ts`. The verifier pins HS256, requires `iat` and `exp`, and validates positive safe user ID, matching `sub`, email shape, Prisma role, and timestamp bounds. Session resolution uses the verified ID to load the current user and role from PostgreSQL; invalid tokens fail closed. Canonical existing signed tokens remain compatible. No issuer or audience claim was added because the application does not issue either claim. Vehicle ownership checks now require positive safe user and vehicle IDs. Registration remains CUSTOMER-only and cookie attributes/behavior are unchanged.

Results actually run in the local Windows workspace:

- Focused JWT/session/authorization/vehicle tests: **29 passed, 0 failed**.
- `npm run test:unit:phase11`: **22 passed, 0 failed**; `npm run test:unit:phase12`: **20 passed, 0 failed**.
- Combined unit/mock/regression suite: **224 passed, 0 failed**.
- `npx tsc --noEmit`: passed; `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.4.0 after a permission-enabled retry; the restricted run could not create Next.js's temporary Prisma junction.
- `npm run test:e2e`: **9 passed, 0 failed** in Chromium after a permission-enabled retry. It uses synthetic test-only sessions and a deliberately unreachable database; it does not verify persisted browser login or database-backed browser workflows.
- `npm run test:integration:phase12`: **1 passed, 0 failed**; `npm run test:integration:phase12:vehicles`: **1 passed, 0 failed** against the guarded dedicated loopback `vehicle_service_test` database. Read-only preflight verified target identity and empty application schema. These tests exercised persisted register/login/logout and owner-scoped vehicle CRUD/isolation, cleaning only their run-created fixtures. No reset, seed, or schema initialization was run.
- The local PostgreSQL results do not verify production/external database state. No live SMTP test or deployment occurred.
- No fresh audit was run. The last audit refresh was blocked by registry DNS; the historical result (0 production findings, 5 high development dependency findings) is not current audit evidence.

Phase 12 remains **IN PROGRESS** and is not production-ready. Password storage remains synchronous PBKDF2-HMAC-SHA512 with 10,000 iterations and needs a production-strength review plus migration plan. No login rate limiter or password-reset flow was found, and logout cannot revoke a copied stateless token before expiry. Hosting/runtime, external database adoption, TLS/pooling, backup/restore, rollback, and deployment smoke behavior remain unverified. Broad accessibility/performance assessment and live SMTP also remain outstanding. No commit, push, or deployment was made for Gate E.

## Rollback and recovery

- For an application-only release, use the provider's previous immutable deployment/rollback feature, then verify `/` and `/login`. Do not roll code back independently if it requires a newer database schema.
- Treat schema changes as forward-only. Prefer a corrective forward migration. Before a database change, record a verified backup/restore point and agree on an outage window with the database owner; do not assume an automatic reverse migration is safe.
- If data integrity is affected, disable writes or take the service offline, preserve logs without secrets, and restore only with the database owner's approval from a known backup. Verify restored schema and data before reopening traffic.
- The application has not been deployed, and rollback/restore has not been exercised.

## Troubleshooting

- **Build says `JWT_SECRET` is invalid:** set a random production secret with at least 32 characters in the hosting secret manager. Never copy the repository's development fallback into production.
- **Prisma cannot connect:** verify host allowlisting, TLS requirements, connection limits/pooling, and that the URL belongs to the intended non-production database. Do not print the URL in logs.
- **Missing relation/function/enum:** stop rollout and compare the target schema with the reviewed baseline and forward migrations. Do not run `database/reset.sql` against the database.
- **SMTP warning after an operation succeeds:** the database action may have committed while email delivery failed. Check SMTP host/port/security/sender and provider logs; the app does not retry automatically.
- **Production-data readiness:** the focused local PostgreSQL authentication and vehicle CRUD paths passed their guarded integration suites; production/external database behavior and broader authentication/browser journeys remain unverified.
