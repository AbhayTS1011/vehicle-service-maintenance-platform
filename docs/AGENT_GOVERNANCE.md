# Repository Governance — Vehicle Service & Maintenance Platform

## 1. Repository Architecture

- Next.js 16 App Router pages live directly under `app/`; there is no `(dashboard)` route group or `app/api/` tree in the current implementation.
- `proxy.ts` provides dashboard URL gating. Server Actions and feature services must perform their own authorization and input checks; a Proxy result alone is not mutation authorization.
- PostgreSQL definitions and forward-only migrations are maintained under `database/`. Prisma supplies typed access in implemented workflows and client generation; it is not the migration source of truth.
- Domain logic and focused tests live in `lib/`: `auth/`, `admin/`, `booking/`, `service-records/`, `invoicing/`, `reviews/`, and email modules.
- Legacy `db.user` and `db.vehicle` adapters remain placeholders. Do not document authenticated user persistence or owner-scoped vehicle CRUD as complete until these adapters are implemented and tested.

## 2. Domain Ownership Map

| Area | Primary locations | Review focus |
|---|---|---|
| Database and SQL | `database/`, `prisma/schema.prisma` | Referential integrity, SQL source of truth, forward-only migrations, safe target verification |
| Authentication | `lib/auth/`, `proxy.ts`, `lib/admin/session.ts` | Signed-session identity, server-side roles, persistence limitations |
| Booking and scheduling | `lib/booking/`, `app/dashboard/customer/bookings/`, `app/dashboard/provider/bookings/` | Ownership, conditional state transitions, availability and concurrency |
| Service records and parts | `lib/service-records/`, provider completion pages, `database/triggers.sql` | Transactional completion, inventory trigger, rollback and retry safety |
| Invoices | `lib/invoicing/`, invoice routes, `database/functions.sql` | SQL-calculated totals, one invoice per booking, atomic booking transition |
| Reviews | `lib/reviews/`, customer booking detail | Owner scope, eligibility, duplicate and concurrent submission |
| Email | `lib/email.ts`, `lib/email-workflows.ts` | Safe content, post-commit best-effort delivery, no outbox/retry |
| Admin dashboard | `lib/admin/dashboard.ts`, `app/dashboard/admin/page.tsx` | Admin authorization, aggregate correctness, safe empty/error behavior |
| Documentation | `README.md`, `PROJECT_STATUS.md`, `PLAN.md`, `docs/` | Evidence labels, historical/current distinction, approved scope |

## 3. Verification and Safety Rules

1. Inspect the current Git state and preserve all uncommitted work before editing.
2. Run focused commands from `package.json`; unit/mock results do not establish PostgreSQL persistence.
3. Integration suites must use the explicit guarded dedicated test-database URL. Never bypass target/schema preflights or target production/external databases.
4. `database/schema.sql` contains destructive `DROP ... CASCADE` operations. Do not run it against an existing or populated database; use only a newly created disposable database when bootstrap is explicitly required.
5. Record which environment actually ran each check. Do not claim production database verification or live SMTP delivery without direct evidence.
6. Keep `PLAN.md` as the approved scope authority. Do not begin later phases without an explicit request.
7. Do not commit, push, or modify unrelated files unless the user explicitly asks.

## 4. Current Verification Scope

The current recorded status for Phases 1–10 is in `PROJECT_STATUS.md`. The focused Phase 5–10 PostgreSQL results use only the dedicated test database. Production/external databases were not tested. Phase 9 live SMTP delivery was not tested; notification delivery is best-effort without a durable outbox or automatic retry. Phase 11 and Phase 12 remain NOT STARTED.
