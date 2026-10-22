# Vehicle Service & Maintenance Platform

An in-progress, database-driven vehicle service and maintenance platform built with Next.js, TypeScript, PostgreSQL, and Prisma. Phases 1–11 have documented implementation and verification boundaries; Phase 12 deployment readiness is in progress, and this repository is not represented as production-ready.

---

## Team Details

- **Team Number:** 22
- **Team Members:**
  - PES1UG24AM008
  - PES1UG24AM013
- **Section:** AIML A
- **Program:** BTech Artificial Intelligence and Machine Learning
- **University:** PES University

---

## Project Overview

The **Vehicle Service & Maintenance Platform** is intended for a single vehicle service center. Implemented workflows cover booking through invoice and review, service records, email workflow context, an admin operational dashboard, PostgreSQL-backed authentication, and customer vehicle CRUD. Release Gates A and B were verified against the dedicated local PostgreSQL test database; those results do not verify a production deployment.

```text
Customer → Vehicle → Service Booking → Mechanic Assignment → Service → Parts Used → Invoice → Review
```

The SQL source files demonstrate relational constraints, transactions/triggers, indexes, views, and analytics examples. Only the behavior documented as implemented and tested below is claimed as integrated; the analytics SQL is not wired into the dashboard.

---

## Problem Statement

Vehicle service centers must coordinate multiple complex entities—customers, vehicles, service appointments, mechanics, spare parts inventory, service records, and invoices. Manual or disconnected systems make it difficult to:
- Track multi-vehicle customer service histories.
- Manage mechanic workloads and prevent double-booking race conditions.
- Maintain real-time inventory consistency during part consumption.
- Generate reliable operational invoices and service analytics.

The project is designed to address these challenges with PostgreSQL and transactional workflows. Implementation and verification vary by feature; see the project status and known limitations below.

---

## Project Goals

- Design a normalized relational PostgreSQL database (3NF).
- Support individual customers and multi-vehicle fleet management.
- Provide complete service booking lifecycle tracking.
- Enable service providers to manage mechanics, appointments, and inventory.
- Automate invoice calculations and part stock deductions via database triggers/functions.
- Implement authentication (JWT and password hashing) and Role-Based Access Control (RBAC); focused Prisma-backed registration/login/session behavior was verified against the guarded dedicated PostgreSQL database in Release Gate A. Production security hardening remains outstanding.
- Include advanced SQL examples (views, CTEs, and window functions); integration into application workflows varies.

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 16.4.0 (App Router), React 19.3.0, TypeScript, CSS/inline styling |
| **Backend** | Next.js Server Components and Server Actions, business logic layer; no API route tree is currently present |
| **Database** | PostgreSQL 14+ (SQL-First Approach) |
| **ORM / Type Generation** | Prisma for typed data access in implemented workflows and client generation; SQL remains schema/migration source of truth |
| **Authentication** | Node.js crypto PBKDF2-SHA512, jose (JWT), HTTP-only cookies, Prisma-backed registration/login (focused dedicated-PostgreSQL integration passed; broader auth journeys remain limited) |
| **Validation & Forms** | Zod, React Hook Form |
| **Email Service** | Nodemailer (SMTP) |
| **Testing** | Node.js built-in test runner and `tsx`; focused unit/mock and guarded PostgreSQL suites |
| **Deployment** | Not configured or production-verified |

---

## Database Architecture (SQL-First)

This project follows an **SQL-first** database architecture:

```text
SQL Schema Definitions (database/*.sql)
   ↓
PostgreSQL schema/source files
   ↓
Prisma schema/client for typed access
   ↓
Application repositories and services
```

### Core Schema Entities
1. **users**: User accounts with RBAC roles (`CUSTOMER`, `SERVICE_PROVIDER`, `FLEET_MANAGER`, `ADMIN`).
2. **vehicles**: Multi-vehicle fleet linked to users.
3. **service_center**: Single service center configuration.
4. **mechanics**: Mechanic profiles and specializations.
5. **service_types**: Catalog of offered services.
6. **parts**: Inventory and stock tracking.
7. **bookings**: Appointment records.
8. **services**: Execution records linked to bookings.
9. **service_parts**: Junction table for parts consumed during service.
10. **invoices**: Auto-calculated invoice generation.
11. **reviews**: Customer ratings and feedback.
12. **notifications**: Notification table in the SQL schema; Phase 9 email delivery does not use it as an outbox.
13. **audit_logs**: System audit trail.

---

## Advanced DBMS Features

- **Transactions & Concurrency**: Atomic operations for service bookings, mechanic assignments, and inventory deductions with row-level locking support.
- **Triggers**: Automated `updated_at` timestamps and real-time inventory reduction (`deduct_part_inventory`) triggered upon part consumption.
- **Functions**: Stored procedures for invoice subtotal/tax/total calculation (`calculate_invoice_totals`).
- **Views**: SQL definitions include operational summaries; installation on arbitrary databases is not assumed, and the Phase 10 dashboard queries base tables.
- **Indexes**: Optimized lookup indexes on foreign keys, email addresses, license plates, and status fields.
- **CTEs & Window Functions**: `database/analytics.sql` includes monthly revenue and mechanic workload examples; these are not integrated into the Phase 10 dashboard.

---

## Booking Workflow

```text
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → INVOICED
```

The provider/admin invoice workflow issues one invoice for a completed service and then transitions the booking to `INVOICED` in the same PostgreSQL transaction. Pending bookings may also end through the distinct customer `CANCELLED` or provider `REJECTED` outcomes. Server-side business logic uses conditional database updates for implemented transitions. Phase 7's tested invoicing scope passed its dedicated PostgreSQL integration suite (6/6); production/external databases were not tested.

---

## System Architecture

```text
graph TB
    subgraph Frontend Layer
        A[Next.js App Router]
        B[Server / Client Components]
    end

    subgraph Backend Layer
        C[Server Actions]
        D[Business Logic & RBAC]
    end

    subgraph Data Layer
        E[Prisma data-access layer]
        F[(PostgreSQL Database)]
        G[SQL Triggers & Functions]
    end

    A --> C
    C --> D
    D --> E
    E --> F
    G --> F
```

---

## Project Structure

```text
vehicle-service-maintenance-platform/
├── app/                  # Current Next.js App Router pages
│   ├── login/, register/ # Auth pages backed by Prisma user lookup/create; focused PG test passed
│   ├── dashboard/        # Admin, customer, provider, invoice, service-record pages
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── database/             # SQL source of truth, forward migrations, functions, triggers, views, analytics
├── prisma/schema.prisma  # Prisma model mappings and client configuration
├── lib/
│   ├── admin/, auth/, booking/, invoicing/, reviews/, service-records/
│   ├── email.ts, email-workflows.ts
│   └── db.ts             # Prisma feature repositories, including owner-scoped vehicle CRUD
├── proxy.ts              # Dashboard route gating
├── docs/                 # Architecture, governance, and guarded test setup
├── PLAN.md
├── PROJECT_STATUS.md
└── README.md
```

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/AbhayTS1011/vehicle-service-maintenance-platform.git
cd vehicle-service-maintenance-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your PostgreSQL connection string and secrets:
```bash
cp .env.example .env
```

### 4. Setup Database
For a **brand-new, verified-empty database**, use the reviewed create-only baseline. First provision a separate database, then verify its identity and endpoint from your trusted provider/host configuration. The baseline independently refuses targets that already contain application objects:

```powershell
psql -X -v ON_ERROR_STOP=1 "$env:DATABASE_URL" -c "SELECT current_database(), current_user, inet_server_addr(), inet_server_port();"
psql -X -v ON_ERROR_STOP=1 "$env:DATABASE_URL" -f database/baseline.sql
```

Review the identity query output against the database you intentionally provisioned before running the second command. `database/baseline.sql` installs the current schema, functions, triggers, views, and indexes in one transaction and records version `20261020_001` in `schema_migrations`. It contains no sample rows. Seed data is optional and belongs only in a disposable development database. Do not run a baseline against an existing or partially initialized database; use a separately reviewed adoption/migration procedure.

`database/schema.sql` is the create-only schema source consumed by the baseline. `database/reset.sql` is explicitly destructive and only for disposable local development; never use it for normal setup or any shared, hosted, production, or valuable database. For the dedicated PostgreSQL integration-test target and its separate safety procedures, see [docs/phase-5-postgres-test-setup.md](docs/phase-5-postgres-test-setup.md).

### 5. Generate Prisma Client
```bash
npm run db:generate
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Status

| Phase | Milestone | Status |
| :--- | :--- | :--- |
| **Phase 1** | Foundation & Infrastructure | ✅ Core schema, framework, and configuration files implemented; no standalone comprehensive phase test claimed |
| **Phase 2** | Authentication & Authorization | ✅ Registration/login/logout persistence verified by the guarded Release Gate A PostgreSQL test (1/1); broader authentication journeys remain limited |
| **Phase 3** | Vehicle Management | ✅ Implemented and verified within tested scope: owner-scoped CRUD, cross-customer isolation, uniqueness, and booking-history deletion protection (unit + dedicated PostgreSQL tests) |
| **Phase 4** | Service Center & Mechanic Management | ✅ Implemented; mocked CRUD tests passed, dedicated PostgreSQL CRUD integration not recorded (Phase 4C booking workflow has separate PostgreSQL verification) |
| **Phase 5** | Booking System | ✅ Complete and verified through `COMPLETED` (5 PostgreSQL integration tests in the recorded dedicated-database run) |
| **Phase 6** | Service Records & Parts | ✅ Verified for service records and parts consumption (4 PostgreSQL integration tests passed in the user's Windows PowerShell environment) |
| **Phase 7** | Invoicing | ✅ Implemented and verified within tested scope (6 dedicated PostgreSQL integration tests passed; production/external DB unverified) |
| **Phase 8** | Reviews & Ratings | ✅ Implemented and verified within tested scope (11 unit, 150 regression, and 4 dedicated PostgreSQL integration tests passed; production/external DB untested) |
| **Phase 9** | Email Notification System | ✅ Implemented and verified within tested scope (10 unit, 161 regression, and 3 guarded dedicated-PostgreSQL integration tests passed; TypeScript, lint, and build passed; production/external DB and live SMTP untested) |
| **Phase 10** | Admin Dashboard | ✅ Implemented and verified within tested scope; 3 unit tests, 184 regressions, 1 dedicated PostgreSQL integration test, TypeScript, lint, and production build passed; production/external DBs untested |
| **Phase 11** | Testing & Quality Assurance | ✅ Complete within the defined tested QA scope (19 focused, 206 combined unit/mock/regression, 23 dedicated PostgreSQL integration, and 7 local Playwright tests pass; TypeScript, lint, build pass; audit residual documented) |
| **Phase 12** | Polish & Deployment | 🟡 In progress; responsive/focus improvements and production JWT-secret guard added, deployment not configured or verified |

Phase 11 was **complete within its defined tested QA scope at its verification checkpoint**. Focused tests passed 19/19, the combined unit/mock/regression suite 206/206, and the six guarded Phase 5–10 PostgreSQL suites 23/23 in the user's Windows PowerShell environment against the dedicated local test database. The recorded 7-test Playwright suite used synthetic test-only JWT cookies and a deliberately unreachable local database URL; it covered route access and safe database-error rendering, not persisted login, booking writes, customer-data isolation, or live database behavior. At that Phase 11 checkpoint, persisted authentication and vehicle CRUD were incomplete; Phase 12 Release Gates A/B have since verified focused PostgreSQL auth and vehicle behavior against the dedicated test DB. Phase 12 added responsive layout and keyboard-focus browser checks; see its current verification results in [docs/phase-12-deployment.md](docs/phase-12-deployment.md). TypeScript, lint, and production build from Phase 11 are historical baseline checks, not rerun claims for Phase 12. The latest recorded production-only audit found 0 vulnerabilities; the full audit reported 5 high-severity findings in the development dependency chain ending at `braces@3.0.3` (GHSA-vfj7-8cjw-p6xm). No compatible patched release was identified in that audit, and npm's suggested `eslint-config-next` downgrade is breaking. Production/external databases and live SMTP remain untested. See [docs/phase-11-qa.md](docs/phase-11-qa.md) for Phase 11 evidence.

Phase 12 — **Polish & Deployment — IN PROGRESS**. Release Gates A/B verified focused auth persistence and owner-scoped vehicle CRUD against the guarded dedicated local PostgreSQL test database. Gate C's recorded evidence covers a create-only transactional baseline on a separate disposable local PostgreSQL database; Gate D did not rerun it. On 2026-10-20, Gate D reran static baseline checks (3/3), Phase 11 tests (22/22), Phase 12 tests (8/8), the combined unit/mock/regression suite (217/217), auth integration (1/1), vehicle integration (1/1), the six Phase 5–10 PostgreSQL suites (23/23), TypeScript, lint, build (Next.js 16.4.0), and Playwright (9/9). Fresh npm audits were blocked by registry DNS; the last recorded audit had 0 production findings and 5 high findings in development dependencies. Production/external databases, hosting/deployment, live SMTP, full accessibility review, and performance benchmarks remain unverified. Security follow-up is required for the legacy custom JWT verifier used by vehicle sessions and the synchronous 10,000-iteration PBKDF2 work factor before production use. See [docs/phase-12-deployment.md](docs/phase-12-deployment.md); Phase 12 has not passed release acceptance.

Gate A/B historical results above remain intact. Gate D on 2026-10-20 reran the two guarded Release Gate PostgreSQL suites, six Phase 5–10 suites, all applicable unit/regression checks, baseline static checks, TypeScript, lint, production build, and Playwright; see the detailed run record in [docs/phase-12-deployment.md](docs/phase-12-deployment.md). PostgreSQL integration used only the loopback dedicated test DB, separate from the disposable baseline database. No production/external database was accessed.

Phase 5 acceptance details and verification evidence are in [PROJECT_STATUS.md](PROJECT_STATUS.md#3a-phase-5-acceptance-checklist) and [docs/phase-5-postgres-test-setup.md](docs/phase-5-postgres-test-setup.md). Its recorded PostgreSQL integration run passed 5/5 against the dedicated test database; mocked/unit and safety-guard tests passed 146/146. Phase 6 integration passed 4/4 in the user's Windows PowerShell environment. Phase 7's latest verification passed `npm run test:integration:phase7` (6/6) against the dedicated PostgreSQL test database, `npm run test:unit:phase7` (8/8), TypeScript, lint, production build, and `git diff --check`. The earlier PostgreSQL `P2010`/`42883` mismatch was corrected by casting the canonical `SERIAL`/Prisma `Int` service ID to `INTEGER` at the SQL call. A later invoice-history projection omission was fixed by selecting the nested service ID. Production/external databases were not tested. Fresh `npm audit --omit=dev` on 2026-10-20 reported 0 production vulnerabilities; fresh full `npm audit` reported 5 high-severity development dependency findings. Phase 7 is verified within its tested scope. Phase 8 reviews are implemented and verified within the tested scope: 11 unit tests, 150 regression tests, and 4 dedicated PostgreSQL integration tests passed; TypeScript, lint, and production build passed. PostgreSQL testing used the guarded dedicated test database; production/external databases were not tested. Phase 9 email behavior is implemented; its 10 unit tests and 161 regression tests passed, along with TypeScript and lint. The guarded PostgreSQL recipient-context suite passed 3/3 against the dedicated test database. Production/external databases and live SMTP delivery were not tested. Phase 10 admin dashboard is implemented and verified within its tested scope: 3 unit tests, 184 regression tests, 1 guarded PostgreSQL integration test, TypeScript, lint, and the Next.js 16.4.0 production build passed. `git diff --check` passed with LF-to-CRLF warnings only. The PostgreSQL integration test used the dedicated test database, not production or an external database. Live SMTP delivery remains an untested Phase 9 limitation. At the Phase 10 verification checkpoint, Phases 11 and 12 had not started; Phase 11 has since been completed within its tested QA scope. The six guarded PostgreSQL suites passed 23/23 in the user's Windows PowerShell environment against the dedicated local test database; no production/external database was tested. Phase 11's limited Playwright route/auth suite passed 7/7 in this workspace, and both dependency audits were refreshed. At the Phase 11 checkpoint, Phase 12 had not started. Phase 12 is now IN PROGRESS; see [docs/phase-12-deployment.md](docs/phase-12-deployment.md) for current progress and release blockers. See [docs/phase-11-qa.md](docs/phase-11-qa.md) for Phase 11 scope, environment, and results.

Phase 6 records service work and parts used when a provider completes an in-progress booking. Phase 7 adds provider/admin invoice issuance and customer/provider/admin invoice views. Totals come from the existing `calculate_invoice_totals(p_service_id)` SQL function: labor plus historical consumed-part prices, with its existing 18% tax rule. Invoice creation and `COMPLETED → INVOICED` occur atomically. Invoice numbers use `INV-<bookingId>`; because no payment terms are defined, due date equals issue date. The Phase 7 integration suite passed 6/6 against the dedicated PostgreSQL test database; production/external databases remain unverified. The parts catalog/restocking UI is absent. Phase 8 adds owner-scoped customer reviews for completed/invoiced bookings with service records. Its 11 unit, 150 regression, and 4 dedicated PostgreSQL integration tests passed; TypeScript, lint, and production build passed. PostgreSQL testing used the guarded dedicated test database, not production/external databases. Phase 9 sends customer emails for booking request/status events and invoice issuance through server-configured SMTP (`SMTP_HOST`, `SMTP_PORT`, optional `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Add these values to the server environment; `.env.example` uses placeholders. Delivery is best-effort with no automatic retry/outbox, and failures produce a visible warning after the database operation succeeds. Its mocked email tests passed 10/10 and its guarded PostgreSQL recipient-context suite passed 3/3 against the dedicated test database. Production/external databases and live SMTP delivery were not tested; delivery remains best-effort after commits with no outbox or automatic retry. Phase 10 adds `/dashboard/admin` with booking-status, mechanic, low-stock, invoice, review, and recent-booking summaries sourced from existing PostgreSQL tables; the admin-only route is linked from `/dashboard`. Its unit tests passed 3/3, relevant regressions passed 184/184, TypeScript and lint passed, the guarded dedicated PostgreSQL integration suite passed 1/1, and `npm run build` passed with Next.js 16.4.0, including compilation, TypeScript checks, static-page generation, and final optimization, in the user's regular Windows PowerShell environment. `git diff --check` passed with LF-to-CRLF warnings only. No migration was required. Production and external databases were not tested. Live SMTP delivery remains untested as a Phase 9 limitation. See [PROJECT_STATUS.md](PROJECT_STATUS.md#3f-phase-10--admin-dashboard) for details. At the Phase 10 verification checkpoint, Phases 11 and 12 had not started; Phase 11 is now complete within its tested QA scope, and Phase 12 has since started (current status is summarized above).

---

## Security

- Password hashing uses Node.js crypto PBKDF2-SHA512 and JWT uses `jose`. Registration/login use Prisma-backed user operations and signed HTTP-only sessions; Release Gate A verified the focused persistence path against the dedicated PostgreSQL test database. Broader authentication coverage remains limited.
- Security review found that `lib/vehicles/server-session.ts` resolves actors through a legacy hand-written JWT parser in `lib/auth/session.ts`, while other server routes use `jose` from `lib/auth/jwt.ts`. The legacy verifier does not require an expiration claim or validate a complete claim schema. Consolidate verification on the maintained `jose` path and test mandatory claims before production use. Logout clears the browser cookie but does not revoke an already copied stateless token before expiration.
- Password derivation currently uses synchronous PBKDF2-HMAC-SHA512 with 10,000 iterations. Review and benchmark a stronger asynchronous password-hashing configuration, including a safe migration strategy for stored hashes, before production use. No application login rate-limit implementation was found in the reviewed `app/` and `lib/` code. These are review findings; no application changes were made in Gate D.
- HTTP-only cookie handling and Proxy role gates are present; implemented feature mutations also need server-side role/ownership checks.
- Do not use the development JWT fallback secret in deployment; set a strong `JWT_SECRET`.
- Parameterized Prisma operations and server-side validation are used in implemented workflows. Registration/login validate input; customer vehicle CRUD derives owner identity from the verified server session and scopes all operations to that owner.
- Sensitive credentials excluded via `.gitignore`.

---

## License

This project is developed as part of university coursework at PES University.
