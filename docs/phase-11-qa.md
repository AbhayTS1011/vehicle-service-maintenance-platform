# Phase 11 — Testing & Quality Assurance

## Scope

`PLAN.md` assigns three tasks to Phase 11 but lists no detailed task descriptions. The working breakdown used for this closeout inventories coverage, adds focused authentication/authorization regression tests, and runs the available unit, database, browser, static, build, and security checks. The PostgreSQL regression set is the six existing guarded Phase 5–10 suites; Phase 11 has no separate PostgreSQL feature suite. This records QA for implemented features and does not claim the earlier incomplete auth/vehicle product features are complete.

## Workflow test matrix

| Workflow | Existing/current coverage | Verification boundary and remaining gap |
|---|---|---|
| Authentication and authorization | JWT tests; new password, Proxy role-routing, public-registration input/role, and Server Action safe-error tests. | User persistence is still a placeholder; registration/login are not PostgreSQL-backed. No complete browser sign-in journey is verified. |
| Vehicle ownership and CRUD | Schema/model exists; customer route/form files exist. | `db.vehicle` remains placeholder code and the add form still uses a fixed owner ID. No persisted owner-scoped CRUD or vehicle integration tests. |
| Service-center and mechanic management | 13 mocked management tests. | No dedicated PostgreSQL CRUD integration result is recorded. |
| Booking and scheduling | Domain unit/mock tests cover lifecycle transitions, roles, ownership, validation, scheduling, and concurrency; Phase 5 PostgreSQL suite passed 5/5. | User-reported Phase 11 integration run used the guarded dedicated test DB; production/external DB remains untested. |
| Service records and inventory | Unit/mock tests cover creation, validation, shortage, errors, and simulated concurrency; Phase 6 PostgreSQL suite passed 4/4. | User-reported Phase 11 integration run used the guarded dedicated test DB; production/external DB remains untested. |
| Invoicing | Unit/mock tests cover totals eligibility, permissions, reads, duplicate/failure behavior; Phase 7 PostgreSQL suite passed 6/6. | User-reported Phase 11 integration run used the guarded dedicated test DB; production/external DB remains untested. |
| Reviews | Unit/mock tests cover ownership, eligibility, input, uniqueness, and concurrency; Phase 8 PostgreSQL suite passed 4/4. | User-reported Phase 11 integration run used the guarded dedicated test DB; production/external DB remains untested. |
| Email workflows | Unit/mock tests cover status mapping, trusted recipient/context, escaping, SMTP configuration/failure, and post-commit delivery warnings; Phase 9 PostgreSQL context suite passed 3/3. | User-reported Phase 11 integration run used the guarded dedicated test DB. Live SMTP delivery is untested; no outbox/retry exists. |
| Admin dashboard | Unit/mock tests cover role checks, missing statuses/center, aggregates, and safe errors; Phase 10 PostgreSQL suite passed 1/1. | User-reported Phase 11 integration run used the guarded dedicated test DB; production/external DB remains untested. |
| UI and end-to-end journeys | Playwright 1.64.1 and Chromium 156 are configured. Seven browser tests passed: real login form/navigation, unauthenticated redirect, malformed/expired cookie rejection, customer denial from provider/admin routes, and CUSTOMER/SERVICE_PROVIDER/ADMIN access to their pages. | Tests use synthetic test-only JWT cookies and an intentionally unreachable local database URL. They verify route handling and safe page error states only, not persisted authentication, booking writes, data isolation, or mutation authorization. Phase 2 auth persistence and Phase 3 vehicle CRUD remain incomplete. |

The Phase 11 PostgreSQL results below are user-reported Windows PowerShell evidence from the six existing Phase 5–10 suites. They verify only the guarded dedicated local test database, not production or external databases.

## Acceptance decision

**Phase 11 is COMPLETE within the defined tested QA scope.** The official plan names three QA tasks but does not enumerate individual scenarios; the working breakdown above is satisfied by the documented coverage inventory, focused auth/authorization regressions, complete available regression/static/build/security checks, six passing guarded PostgreSQL suites, and browser tests for feasible route/session behaviors. The current audit's development-only advisory has been investigated; no compatible fix is available, so it is documented as a residual risk rather than hidden or bypassed.

The browser suite does not verify persisted login, customer-data isolation, booking writes, provider mutation permissions, or database-backed admin data. Those journeys are currently infeasible because Phase 2 user persistence and Phase 3 vehicle persistence remain incomplete. Production/external database operation and live SMTP delivery were also not tested. These are stated boundaries of this closeout and are not represented as passed. Phase 12 remains NOT STARTED.

## Defects reproduced and corrected

- `proxy.ts` previously allowed any nonempty role claim through the general `/dashboard` route. It now checks claims against Prisma's `UserRole` values before granting access to dashboard paths.
- Public registration previously trusted the client-provided role, allowing a submitted `ADMIN` or `SERVICE_PROVIDER` role to reach the account adapter. Registration now validates server-side fields, discards unknown fields, and assigns only `CUSTOMER`; the public role selector was removed.
- Authentication Server Actions previously returned raw caught exception messages. They now return generic failure text. Tests confirm database details are not exposed.
- The unused legacy vehicle-ownership helper previously allowed any customer/fleet manager through without checking ownership. It now fails closed for invalid IDs and verifies ownership through the repository; focused tests cover those checks.

These corrections do not complete authentication: `db.user.findUnique()` still returns `null`, `db.user.create()` still fabricates a record, and login does not establish a persisted session. Provider/admin account provisioning is not implemented.

## Current Phase 11 verification (2026-10-20)

The six PostgreSQL results are user-confirmed Windows PowerShell evidence. Focused and combined tests, static checks, build, browser E2E, and audits below were executed in this workspace on 2026-10-20, unless explicitly noted.

- `npm run test:unit:phase11`: **19 passed, 0 failed**.
- Combined unit/mock/regression run: **206 passed, 0 failed** using the exact command recorded in `PROJECT_STATUS.md` Section 3G.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.4.0, including compilation, TypeScript checks, static page generation, and final optimization. The build completed in the permission-enabled workspace environment.
- `npm run test:e2e`: **7 passed, 0 failed** with Chromium 156 and a local Next development server. The server was configured with test-only JWT settings and a deliberately unreachable database URL at `127.0.0.1:1`; the browser run did not access PostgreSQL or production services. A first restricted-sandbox attempt failed because Windows denied Next.js's temporary Prisma junction; the local permission-enabled retry passed all seven tests.
- Fresh `npm audit --omit=dev`: **0 vulnerabilities**, exit 0.
- Fresh full `npm audit`: **5 high, 0 other findings**, exit 1, all in development dependencies (`@next/eslint-plugin-next`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`). The advisory path is `eslint-config-next@16.4.0` → `@next/eslint-plugin-next@16.4.0` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`, associated with GHSA-vfj7-8cjw-p6xm. No patched `braces` version is available. `npm audit fix --dry-run` proposed a major downgrade to `eslint-config-next@14.2.35`; no dependency remediation was applied.
- `npm run test:integration:phase11`: **23 passed, 0 failed across six suites**, as reported by the user from Windows PowerShell against the guarded dedicated PostgreSQL test database: Phase 5 booking lifecycle **5/5**; Phase 6 service records/inventory **4/4**; Phase 7 invoicing **6/6**; Phase 8 reviews/ratings **4/4**; Phase 9 email context **3/3**; Phase 10 admin dashboard **1/1**. This does not verify production/external DBs.
- Separate workspace attempt: stopped in Phase 5's explicit target guard because `PHASE5_TEST_DATABASE_URL` was unset. It did not connect to PostgreSQL or write fixtures. Docker Desktop's PostgreSQL engine was unavailable (`docker compose` could not connect to `npipe:////./pipe/dockerDesktopLinuxEngine`). The ignored `.env.postgres-test.local` file exists; its contents were not read or printed. No database was reset or modified.
- Production/external database verification: not performed.

### PostgreSQL suite selection and safe rerun

Phase 11 has no separate PostgreSQL feature implementation. Its database regression set is the six existing guarded suites: Phase 5 bookings, Phase 6 service records/inventory, Phase 7 invoicing, Phase 8 reviews, Phase 9 email context, and Phase 10 admin dashboard. The `test:integration:phase11` npm script runs those commands serially and stops on the first failure. Each suite uses the Phase 5 target helper, which accepts only `vehicle_service_test` / `vehicle_service_test` on `127.0.0.1:55432` with `schema=public`; it sets `DATABASE_URL` from the explicitly opted-in `PHASE5_TEST_DATABASE_URL` before Prisma loads. Suite preflights verify their schema/function/trigger requirements and fixture-table safety. Do not run the suites against production or external databases, bypass a preflight, reset the populated test database, or run `database/schema.sql` against it.

In PowerShell at the repository root, with Docker Desktop available and the documented dedicated test database already initialized, start/check only the named test Compose service and set the guarded URL from the ignored local password file without printing it:

```powershell
$compose = @('--project-name', 'vehicle-service-phase5-test', '--env-file', '.env.postgres-test.local', '-f', 'compose.postgres-test.yaml')
docker compose @compose up -d
docker compose @compose ps
docker compose @compose exec -T postgres pg_isready -U vehicle_service_test -d vehicle_service_test
$settings = Get-Content -LiteralPath '.env.postgres-test.local' | ConvertFrom-StringData
$env:PHASE5_TEST_DATABASE_URL = "postgresql://vehicle_service_test:$($settings.POSTGRES_TEST_PASSWORD)@127.0.0.1:55432/vehicle_service_test?schema=public"
Remove-Variable settings
npm run test:integration:phase11
Remove-Item Env:PHASE5_TEST_DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
```

If `pg_isready` fails, stop and restore the dedicated test environment; do not proceed to SQL bootstrap against an existing database. A freshly created empty disposable database requires the separate one-time schema/migration/function/trigger bootstrap in [docs/phase-5-postgres-test-setup.md](phase-5-postgres-test-setup.md). Never run that bootstrap against the already-populated test target. The harnesses require safe target identity and clean fixture preconditions; if any preflight fails, investigate that condition without deleting unrelated rows.

### Browser E2E scope and rerun

The minimal browser suite is in `e2e/route-protection.spec.ts`, configured by `playwright.config.ts`; run it with `npm run test:e2e`. It covers page rendering/navigation and the Proxy's role/invalid-session redirects using locally signed test-only JWTs. The local dev server receives a fixed, intentionally unreachable `127.0.0.1:1` database URL even if the parent shell has a configured database URL. It cannot reach production or the dedicated PostgreSQL database. Data-backed page tests expect safe load-error messages; they do not prove successful persistence or customer data isolation. The suite passed 7/7 in Chromium 156 on 2026-10-20.

Do not treat this as complete authentication or product-workflow E2E: `db.user` remains a placeholder, and Phase 3 vehicle persistence is incomplete. Booking creation, owner-scoped database reads, service-provider mutation authorization, and administrator data correctness need a real isolated test data fixture and working persistence before they can be tested end to end.

### Dependency audit and advisory

Fresh audits ran on 2026-10-20 after npm registry access returned. `npm audit --omit=dev` found 0 production dependency vulnerabilities. Full `npm audit` reported five high-severity development dependency findings in one transitive Next ESLint/fast-glob/micromatch/braces chain. The current `braces@3.0.3` advisory GHSA-vfj7-8cjw-p6xm has no patched release; npm's only proposed fix is a major downgrade to `eslint-config-next@14.2.35`. `npm audit fix --dry-run` was inspected, and no dependency changes were applied to remediate the advisory. Keep production-only and full-audit claims separate; the dependency tree is not vulnerability-free.

## Known limitations and follow-up outside Phase 11 closeout

1. Extend browser coverage after persisted Phase 2 authentication, Phase 3 owner-scoped vehicle CRUD, and safe isolated fixture support exist; the current suite makes no data-isolation or write-persistence claim.
2. Track the unresolved development-only GHSA-vfj7-8cjw-p6xm advisory and rerun audits after a compatible upstream fix becomes available. Do not downgrade Next 16's ESLint config to silence the audit.
3. Production/external database migration and runtime verification remain untested; all recorded PostgreSQL integration results use the dedicated local test database.
4. Live SMTP delivery remains untested and Phase 9 delivery has no outbox or automatic retry.

Phase 11 is **COMPLETE within the defined tested QA scope**. Phase 12 — Polish & Deployment — remains **NOT STARTED**.
