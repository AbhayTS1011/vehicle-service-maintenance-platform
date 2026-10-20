# Dedicated PostgreSQL Test Setup and Phase 5–10 Verification Notes

This guide is for a disposable local test database only. It does not configure production. The Compose service binds PostgreSQL to `127.0.0.1:55432`, uses a separate database/user, and has no host volume. Stopping the container preserves its test data; removing the container discards it.

## 1. Create a local-only password file

Start Docker Desktop (Linux containers) and confirm `docker info` succeeds. From PowerShell in the repository root, generate a URL-safe random password into an ignored file without printing it:

```powershell
$bytes = [byte[]]::new(32)
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$password = -join ($bytes | ForEach-Object { $_.ToString('x2') })
Set-Content -NoNewline -LiteralPath '.env.postgres-test.local' -Value "POSTGRES_TEST_PASSWORD=$password"
Remove-Variable password, bytes
```

`.env.postgres-test.local` matches the existing `.gitignore` rule `.env*.local`. Do not commit it. The tracked `.env.postgres-test.example` is intentionally blank.

## 2. Start and identify the isolated database

```powershell
$compose = @('--project-name', 'vehicle-service-phase5-test', '--env-file', '.env.postgres-test.local', '-f', 'compose.postgres-test.yaml')
docker compose @compose up -d
docker compose @compose ps
docker compose @compose exec -T postgres pg_isready -U vehicle_service_test -d vehicle_service_test
```

Use only this Compose target for migration/integration testing. Do not point it at or add a volume from another PostgreSQL instance. To stop while retaining test data, run `docker compose @compose stop`.

Set the explicit integration-test URL only in the current PowerShell process; this does not write credentials to a file or print them. The test harness refuses every target except the documented loopback test DB and copies this explicit value to `DATABASE_URL` before importing Prisma:

```powershell
$settings = Get-Content -LiteralPath '.env.postgres-test.local' | ConvertFrom-StringData
$env:PHASE5_TEST_DATABASE_URL = "postgresql://vehicle_service_test:$($settings.POSTGRES_TEST_PASSWORD)@127.0.0.1:55432/vehicle_service_test?schema=public"
```

After verification, remove process variables with `Remove-Item Env:PHASE5_TEST_DATABASE_URL` and `Remove-Variable settings`.

## 3. Verify the migration sequence on an old baseline

The pre-migration schema at commit `76e0b2e` has the original booking enum and lacks the scheduling columns/table. That schema contains `DROP ...` statements. Apply it only to the empty `vehicle_service_test` database created above, never to an existing database:

```powershell
git show 76e0b2e:database/schema.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
Get-Content -Raw database/migrations/20261009_add_cancelled_booking_status.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
Get-Content -Raw database/migrations/20261011_add_rejected_booking_status.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
Get-Content -Raw database/migrations/20261012_add_booking_scheduling.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
```

Apply in that order. The enum migrations use `ADD VALUE IF NOT EXISTS`; scheduling uses `IF NOT EXISTS` for the column, table, and index and only backfills centers whose legacy hours exactly match the known default. Do not suppress a SQL error or continue to the next migration after a failure.

On this newly initialized database, install the repository's SQL functions and triggers once, after the schema and migrations. `database/triggers.sql` defines `deduct_part_inventory()` and attaches it to `service_parts` as `trg_deduct_inventory`; the file also creates the `updated_at` triggers, so do not rerun it against a database where these triggers are already installed:

```powershell
Get-Content -Raw database/functions.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
Get-Content -Raw database/triggers.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
```

The Phase 6 test preflight checks `public.deduct_part_inventory()` and confirms `public.trg_deduct_inventory` is attached to `public.service_parts` and calls that function. If the test reports either object missing, inspect the isolated test database first and install the missing definition from `database/triggers.sql`; do not rerun `database/schema.sql`, historical migrations, or the full non-idempotent trigger file against an already populated database.

Check the resulting enum, scheduling objects, constraints, and index directly:

```powershell
$verifySql = @'
SELECT e.enumlabel
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'booking_status' ORDER BY e.enumsortorder;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'service_center' AND column_name = 'time_zone';
SELECT to_regclass('public.service_center_hours') AS hours_table,
       to_regclass('public.idx_bookings_center_status_date') AS capacity_index;
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.service_center_hours'::regclass ORDER BY conname;
'@
$verifySql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test
```

These commands apply only when bootstrapping a new, empty disposable migration-test database. The dedicated database used for the current successful Phase 5 integration verification was already migrated; do not rerun the baseline or migrations against it. Do not infer production or other database migration state from this test.

## 4. Phase 5–10 PostgreSQL integration tests

Run the dedicated suite only after setting `PHASE5_TEST_DATABASE_URL` as above:

For the Phase 11 database regression pass, the `test:integration:phase11` npm script runs the six Phase 5–10 suites serially and stops at the first failure. It does not create or bootstrap a database; each suite retains its existing loopback target and schema/fixture preflight. Current PowerShell setup instructions and availability results are in [docs/phase-11-qa.md](phase-11-qa.md).

```powershell
npm run test:integration:phase5
```

The Phase 6 service-record and parts suite uses the same explicit loopback-only database target and empty-database preflight:

```powershell
npm run test:integration:phase6
```

Phase 7 invoices use the same explicit dedicated loopback URL and require the existing `calculate_invoice_totals(integer)` function from `database/functions.sql`:

```powershell
npm run test:integration:phase7
```

The Phase 7 preflight verifies the target identity, checks that the invoice totals function exists, and requires all fixture tables to be empty before any test fixture writes. If the function is missing, inspect the dedicated test database and apply the existing definition from `database/functions.sql` only when setting up a newly created empty test database. Do not reinitialize the populated database to satisfy this preflight.

The harness checks the connected database identity and expected migrated schema before writing, refuses to run if any application fixture tables are already populated, creates uniquely identified synthetic records, exercises application booking business logic and Prisma persistence, asserts persisted state using fresh reads, and cleans up only the IDs created by that run in a `finally` block. It does not drop, truncate, reset, or rerun migrations.

`lib/booking/booking-service.test.cjs` remains a mocked-repository unit suite; it does not establish PostgreSQL connectivity.

The Phase 5 suite uses synthetic center settings, the IANA zone `Etc/UTC`, and explicit weekly test hours. It exercises lifecycle ownership/transitions, invalid/stale updates, mechanic compatibility, duration and opening-hour boundaries, 15-minute start increments, capacity, overlaps, and serialized availability rechecks. The Phase 6 suite creates a completed service record from an in-progress booking, checks trigger-based part stock deduction, fresh persisted reads, insufficient-stock rollback, and concurrent stale attempts. The Phase 7 suite checks SQL-calculated amounts, historical part prices, persisted invoice and booking state, duplicate/concurrent issue protection, failure rollback, invalid states, and customer scoping. All suites use unique fixtures and clean up only IDs created by that run. Continue to use only the explicitly validated `PHASE5_TEST_DATABASE_URL` for reruns.

### Fresh-database bootstrap (choose one path)

For a **brand-new empty** `vehicle_service_test` database, choose either the historical-baseline-plus-migrations sequence above (useful for migration testing) or the current-schema path below (useful for a fresh Phase 6 test target). Do not mix the paths. `database/schema.sql` contains destructive `DROP` statements, so run it only against a newly created disposable test database. The populated `vehicle_service_test` used for the recorded test results is not a fresh target: do not run `down`, recreate it, reinitialize it, or apply the schema/migrations there.

With a newly created empty disposable test database available through the Compose service, apply the current source schema and then the existing SQL function/trigger definitions:

```powershell
Get-Content -Raw database/schema.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
Get-Content -Raw database/functions.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
Get-Content -Raw database/triggers.sql | docker compose @compose exec -T postgres psql -v ON_ERROR_STOP=1 -U vehicle_service_test -d vehicle_service_test -f -
```

Only after confirming that the database is the dedicated empty test target, set the explicit URL and run the integration command. Both schema bootstrap paths must finish successfully before testing. For the existing already-initialized test database, skip all bootstrap SQL and run only the guarded tests; the Phase 6 preflight reports a missing inventory function/trigger before fixture writes if those prerequisites were not installed. Use [database/functions.sql](../database/functions.sql) and [database/triggers.sql](../database/triggers.sql) as the source of truth; this guide intentionally does not duplicate their SQL definitions.

## Latest verified results

The latest Phase 5 verification completed against the dedicated PostgreSQL test database:

- PostgreSQL integration suite: **5 passed, 0 failed**. This includes database identity/schema preflight and booking lifecycle persistence checks on the isolated test target.
- Mocked/unit and safety-guard tests: **146 passed, 0 failed**.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed with Next.js 16.4.0.
- `npm audit --omit=dev`: **0 vulnerabilities** in production dependencies.
- Full `npm audit`: **5 high-severity findings remain** in development dependencies involving `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, and `braces`; known advisory GHSA-vfj7-8cjw-p6xm remains outstanding.

The integration results verify the dedicated test database only. They do not prove that production or any external database has been migrated. The already-migrated test DB was not reset, reloaded, or migrated during this verification. `PLAN.md` also includes later-project criteria such as invoicing, reviews, notifications, and admin dashboard work; those remain outstanding and are not represented as complete by this Phase 5 test result.

The Phase 5-only booking acceptance boundary is through `COMPLETED`. `PLAN.md` lists `INVOICED` in the product-wide workflow and has a separate Phase 7 Invoicing phase; it does not name the transition's phase separately. At the Phase 5 checkpoint, the app did not generate invoices or transition bookings to `INVOICED`. Phase 7 later implemented that workflow; its verified results are recorded in the subsequent Phase 7–10 summary below.

During the 2026-10-12 finalization audit, the integration command could not be rerun from the Codex execution shell because `PHASE5_TEST_DATABASE_URL` was unset and `127.0.0.1:55432` was unreachable. It stopped at the safety guard before connecting or writing. The 5/5 PostgreSQL result above is the prior recorded successful run; no new database result is claimed for this rerun.

The Phase 6 PostgreSQL integration run was completed in the user's Windows PowerShell environment after installing the SQL function and trigger above: **4 passed, 0 failed** in approximately **1.18 seconds**. It verified service record creation/retrieval, inventory deduction, insufficient-stock rollback, and concurrent completion protection. This is reported user-environment evidence; it was not rerun in the current agent environment. The current agent environment has no explicit test URL and no reachable Docker Desktop engine. No production or external database was tested.

The separate Phase 6 unit/regression command passed **155 tests, 0 failures** in the Codex Windows workspace. Prisma generation, TypeScript, ESLint, and the Next.js 16.4.0 production build also passed there. The production-only audit found **0 vulnerabilities**; the full audit retained **5 high-severity development dependency findings**. These results are distinct from the PostgreSQL run above.

The service-record and parts-consumption scope is verified on the dedicated test database; a parts catalog/restocking UI remains unimplemented. Phase 7 invoice behavior was subsequently verified against the same dedicated test database (6 integration tests passed), as summarized below. Do not reinitialize the populated test database.

The initial Phase 7 verification attempt in the Codex Windows workspace passed **163 unit/regression tests, 0 failures**, and Prisma generation, TypeScript, ESLint, and the Next.js 16.4.0 build; that attempt's integration command stopped at the explicit target guard because its test URL was unavailable. That earlier blocked attempt was superseded by the later successful dedicated-database run recorded below.

Later phase results are also recorded here so this setup guide does not present the old Phase 7 blocker or “Phase 8 and later not started” snapshot as current:

- Phase 7: `npm run test:integration:phase7` passed **6/6** and `npm run test:unit:phase7` passed **8/8** against the dedicated DB and focused unit runner respectively; TypeScript, lint, build, and `git diff --check` passed in the recorded verification. Production/external DBs were not tested.
- Phase 8: **11 unit, 150 regression, and 4 guarded PostgreSQL integration tests passed**; TypeScript, lint, and production build passed. Integration used the dedicated DB only.
- Phase 9: **10 unit, 161 regression, and 3 guarded PostgreSQL context integration tests passed**; TypeScript, lint, and build passed. Production/external DBs and live SMTP delivery were not tested. Delivery is best-effort after commit without an outbox or automatic retry.
- Phase 10: **3 unit, 184 regression, and 1 guarded PostgreSQL integration test passed**; TypeScript, lint, and `npm run build` passed with Next.js 16.4.0 in the user's regular Windows PowerShell environment. `git diff --check` passed with LF-to-CRLF warnings only. Integration used the dedicated test DB, not production/external DBs.

Phases 5–10 have recorded dedicated-test-database evidence as described above; this does not verify production/external database schema, migrations, or runtime connectivity. The Phase 11 regression run subsequently passed all six Phase 5–10 PostgreSQL suites (23/23) in the user's Windows PowerShell environment against the guarded dedicated test database. A later workspace attempt was blocked at the explicit target guard because the URL was unset and Docker Desktop was unavailable; it did not connect or write. Phase 11 was then completed within its defined tested QA scope, including 7 limited local Playwright tests, the recorded regression/static/build checks, and refreshed audits. Phase 12 remains NOT STARTED.
