# PROJECT_STATUS.md - Vehicle Service & Maintenance Platform

## 1. PROJECT OVERVIEW

### Project
**Vehicle Service & Maintenance Platform**

An in-progress, database-driven vehicle service and maintenance management platform built with Next.js, TypeScript, PostgreSQL, and Prisma. Phases 1–11 have the implementation and verification boundaries recorded below; Phase 11 QA is complete within its defined tested scope, while this documentation does not claim production readiness or completion of all project-wide success criteria. This is a university DBMS project at PES University (Team 22, Section AIML A).

### Purpose
The platform is intended to support a single-center vehicle-service lifecycle. Booking, service-record/parts consumption, invoicing, reviews, email workflow context, and an admin operational dashboard are implemented within documented test scopes. User persistence and vehicle CRUD remain incomplete; production readiness is not claimed. PostgreSQL definitions are SQL-first, with Prisma used for typed access in implemented workflows and client generation.

### Team
- **Team Number:** 22
- **Team Members:** PES1UG24AM008, PES1UG24AM013
- **Section:** AIML A
- **Program:** BTech Artificial Intelligence and Machine Learning
- **University:** PES University

---

## 2. CURRENT GIT CHECKPOINT

### CURRENT CHECKPOINT

```text
Branch: main
Current HEAD: `7cea994d4eefb61152efc2970cb9a207b275663e` (`feat: complete vehicle service workflow through admin dashboard`). `origin/main` was verified at the same commit before Phase 11 work. Phase 11 QA changes are currently uncommitted; no commit or push was made for this phase.
Phase 5 booking scope: PostgreSQL integration verified on the dedicated test database (5 passed, 0 failed); mocked/unit and safety-guard tests passed 146/146. Lint, TypeScript, and Next.js 16.4.0 production build passed. `npm audit --omit=dev` reported 0 vulnerabilities; full audit still reports 5 high-severity development dependency findings.
Phase 6 service-record/parts-consumption scope: dedicated PostgreSQL integration passed 4 tests, 0 failed, in the user's Windows PowerShell environment (about 1.18 seconds), after installing the SQL inventory function and trigger from `database/triggers.sql`. Earlier unit/regression suite passed 155/155; Prisma generation, TypeScript, lint, and production build passed.
Phase 2 authentication persistence and Phase 3 vehicle persistence remain partial because their current `lib/db.ts` adapters are placeholders; Phase 1 foundation files exist but do not imply all requirements were independently tested. Phase 4A/4B management is implemented with mocked unit coverage; dedicated PostgreSQL results for Phases 5–10 are listed below. Phase 5 booking scope is verified through `COMPLETED`; Phase 6 service records/parts consumption, Phase 7 invoicing, Phase 8 reviews, Phase 9 email workflow context, and Phase 10 admin dashboard are verified only within their recorded test scopes. Phase 9 live SMTP is untested and delivery is best-effort without outbox/retry. No production or external database has been tested. These results do not establish completion of all `PLAN.md` success criteria or production readiness.
Phase 7 verification: integration 6/6 on the dedicated PostgreSQL test database, invoice unit tests 8/8, TypeScript, lint, production build, and `git diff --check` passed. Registry access was unavailable at that historical checkpoint; the fresh 2026-10-20 audit is recorded in Section 3G (0 production findings, 5 high development findings). Production/external databases were not tested.
Latest committed checkpoint remains `7cea994d4eefb61152efc2970cb9a207b275663e`; Phase 11 QA work is uncommitted.
GitHub:
https://github.com/AbhayTS1011/vehicle-service-maintenance-platform
```

> **Important:** Before making changes, verify the current Git commit and working tree. Do not assume this document is newer than the repository.

---

## 3. PROJECT STATUS TABLE

| Phase | Status |
|---|---|
| Phase 1 — Foundation & Infrastructure | IMPLEMENTED (schema, framework, and configuration files present; no phase-specific comprehensive verification claimed) |
| Phase 2 — Authentication & RBAC | PARTIALLY IMPLEMENTED (JWT/password and Proxy/server-side checks exist; user persistence adapter is placeholder, so persisted registration/login is not verified) |
| Phase 3 — Vehicle Management | PARTIALLY IMPLEMENTED (vehicle routes/UI scaffolding exists; `lib/db.ts` vehicle methods are placeholders and do not provide persisted owner-scoped CRUD) |
| Phase 4A — Service Center Management | IMPLEMENTED; mocked management tests passed, dedicated PostgreSQL feature integration not recorded |
| Phase 4B — Mechanic Management | IMPLEMENTED; mocked management tests passed, dedicated PostgreSQL feature integration not recorded |
| Official PLAN Phase 5 — Booking System | COMPLETE AND VERIFIED (booking scope through COMPLETED; 5 PostgreSQL integration tests passed in the recorded dedicated-DB run) |
| Phase 4C.1 — Booking Creation | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.2 — Booking Listing | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.3 — Customer Booking Details | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.4 — Customer Booking Cancellation | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.5 — Service Provider Pending Booking Queue | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.6 — Provider Booking Confirmation | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.7 — Provider Booking Rejection | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.8 — Provider Starts a Confirmed Booking | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.9 — Mechanic Assignment to Confirmed Bookings | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.10 — Appointment Availability and Scheduling | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.11 — Customer Booking Editing and Rescheduling | COMPLETE (PostgreSQL integration verified) |
| Phase 4C.12 — Provider Booking Completion | COMPLETE (PostgreSQL integration verified) |
| Official PLAN Phase 6 — Service Records & Parts | VERIFIED for service-record/parts-consumption scope (4 PostgreSQL integration tests passed in user's Windows PowerShell environment); production/external DB unverified |
| Official PLAN Phase 7 — Invoicing | IMPLEMENTED AND VERIFIED within tested scope (6 dedicated PostgreSQL integration tests passed) |
| Official PLAN Phase 8 — Reviews & Ratings | IMPLEMENTED AND VERIFIED within tested scope (4 dedicated PostgreSQL integration tests passed; production/external DB untested) |
| Official PLAN Phase 9 — Email Notification System | IMPLEMENTED AND VERIFIED within tested scope (10 unit, 161 regression, and 3 guarded dedicated-PostgreSQL integration tests passed; TypeScript, lint, and build passed; production/external DB and live SMTP untested) |
| Official PLAN Phase 10 — Admin Dashboard | IMPLEMENTED AND VERIFIED WITHIN THE TESTED SCOPE (3 unit, 184 regression, and 1 PostgreSQL integration test passed; TypeScript, lint, production build, and `git diff --check` passed) |
| Official PLAN Phase 11 — Testing & Quality Assurance | COMPLETE within the defined tested QA scope (19 focused, 206 combined unit/mock/regression, 23 dedicated PostgreSQL, and 7 local Playwright tests pass; TypeScript/lint/build pass; audit residual documented; see Section 3G) |
| Official PLAN Phase 12 — Polish & Deployment | NOT STARTED |

---

## 3A. PHASE 5 ACCEPTANCE CHECKLIST

`PLAN.md` names Phase 5 as “Booking System” (four tasks) but does not list those four tasks individually. Its project requirements and success criteria therefore need to be read together with the phase breakdown. The checklist below records the implemented booking scope and keeps later-phase work separate.

| Official requirement / interpretation | Classification | Evidence and scope |
|---|---|---|
| Customers can book appointments at the single service center; bookings begin `PENDING`. | Implemented and tested | `lib/booking/booking-service.ts`, `lib/db.ts`; unit suite `lib/booking/booking-service.test.cjs`; recorded PostgreSQL suite `lib/booking/phase5-postgres.integration.test.cjs` (customer creation and fresh persisted reads). |
| Appointment availability and scheduling. | Implemented and tested | `lib/booking/scheduling.ts`, customer booking UI and service-center schedule UI; unit and recorded PostgreSQL tests cover timezone, service duration, open hours, 15-minute starts, active-mechanic capacity, overlap, and create-time rechecks. |
| Customers can list/view their own bookings, cancel pending bookings, and edit/reschedule pending bookings. | Implemented and tested | Customer booking pages/actions, `lib/booking/booking-service.ts`, and the unit plus recorded PostgreSQL suites cover ownership, state checks, stale edits, and persistence. |
| Providers/admins manage pending appointments: confirm/reject; start confirmed work; assign an eligible mechanic; complete in-progress bookings. | Implemented and tested | Provider booking pages/actions, `lib/booking/booking-service.ts`, `lib/db.ts`; tests cover role checks, conditional transitions, assignment rules, stale/concurrent requests, and fresh persisted state in the recorded PostgreSQL suite. |
| “Complete appointment lifecycle” and the workflow list ending `COMPLETED`. | Implemented and tested for Phase 5 booking scope | The Phase 5 booking flow ends at `IN_PROGRESS → COMPLETED`; its recorded integration suite verifies persisted completion. Phase 6 subsequently extended provider completion to record service details and consumed parts in the same transaction; see the Phase 6 checklist below. |
| Workflow state `INVOICED` / invoice generation. | Phase 5 boundary excludes this; Phase 7 implemented and verified within tested scope | `PLAN.md` lists `INVOICED` in the product-wide workflow and explicitly assigns invoice generation to Phase 7. The plan does not name the transition separately; this project scopes `COMPLETED → INVOICED` with Phase 7 invoicing. Six dedicated PostgreSQL integration tests verified the Phase 7 scope; production/external databases remain untested. |
| Service records/parts, reviews, email notifications, admin dashboard, full-project QA and polish. | Outside Phase 5 acceptance; assigned to later phases | PLAN assigns these to Phases 6, 8, 9, 10, 11, and 12 respectively. Their current status is shown in the project status table; Phase 6's implemented service-record/parts-consumption scope is verified below against the dedicated test database. |
| Production/external database migration state. | Implemented but not sufficiently verified | The dedicated test database passed the recorded schema preflight/integration run. No production or external database was inspected or migrated; this is not established by local test evidence. |

**Phase 5 determination:** the Phase 5 booking scope is complete and verified through `COMPLETED`. `PLAN.md` places invoice generation in Phase 7 but does not explicitly assign the `COMPLETED → INVOICED` transition by name; this checklist treats that transition as part of Phase 7 invoicing rather than adding an invoice-less state change to Phase 5. The overall project success criteria are not complete. The PostgreSQL result below applies only to the dedicated test database.

---

## 3B. PHASE 6 — SERVICE RECORDS & PARTS

`PLAN.md` lists Phase 6 as “Service Records & Parts” (three tasks), but does not break those tasks into detailed acceptance bullets. The project-wide schema and requirements specify service execution records linked to bookings, consumed parts in `service_parts`, and inventory deductions through the existing SQL trigger.

| Phase 6 requirement | Classification | Implementation / verification |
|---|---|---|
| Create and retrieve a service record associated with its booking, vehicle, mechanic, diagnosis, work, and labor cost. | Implemented and PostgreSQL integration verified | Provider completion form records work; customer history is filtered by the signed-in customer ID; provider/admin records view is server-authorized. The user's dedicated DB run verified creation and retrieval. |
| Record parts consumed and deduct current stock through the SQL-first inventory trigger. | Implemented and PostgreSQL integration verified | Server loads price/stock from PostgreSQL, ignores client prices, aggregates duplicate part lines, and inserts `service_parts` so existing `deduct_part_inventory()` handles stock. Integration verified the deduction. |
| Preserve referential integrity and make service, inventory, and booking completion consistent. | Implemented and PostgreSQL integration verified | Existing `services.booking_id` uniqueness and FKs are reused. A transaction locks the in-progress booking and parts, checks stock, creates service/part rows, then conditionally completes the booking; integration verified insufficient-stock rollback and concurrent duplicate protection. No schema migration was required. |

**Phase 6 status:** the implemented service-record and parts-consumption scope is **verified** by the user's Windows PowerShell run of `npm run test:integration:phase6` (4 passed, 0 failed, about 1.18 seconds) on the dedicated PostgreSQL test database. The suite verified service creation/retrieval, trigger-based stock deduction, insufficient-stock rollback, and concurrent completion protection. This is user-reported test evidence; the current agent environment did not rerun the PostgreSQL suite. Production/external database migration state remains unverified. No parts catalog or restocking UI is included. The integration suite is `lib/service-records/phase6-postgres.integration.test.cjs`.

Phase 6 implementation and verification-documentation files: `lib/service-records/service-record-service.ts`, `lib/service-records/service-record-service.test.cjs`, `lib/service-records/phase6-postgres.integration.test.cjs`, `lib/db.ts`, `app/dashboard/provider/bookings/actions.ts`, `app/dashboard/provider/bookings/in-progress/page.tsx`, `app/dashboard/provider/bookings/in-progress/CompleteServiceForm.tsx`, `app/dashboard/service-records/page.tsx`, `app/dashboard/customer/bookings/page.tsx`, `package.json`, `README.md`, `docs/phase-5-postgres-test-setup.md`, and this status document. Phase 7 implementation and dedicated-DB verification are recorded in Section 3C. The parts catalog/restocking interface remains absent.

### Phase 6 verification (2026-10-13)

- `npx prisma generate`, `npx tsc --noEmit`, and `npm run lint`: passed in the Codex Windows workspace.
- `npm run build`: passed on the elevated retry with Next.js 16.4.0; the sandbox attempt could not create Next.js's Prisma junction under `.next` (Windows access denied).
- `node --test lib/service-records/service-record-service.test.cjs lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs lib/admin/management.test.cjs lib/booking/phase5-postgres-test-target.test.cjs`: 155 passed, 0 failed in the Codex Windows workspace.
- `npm run test:integration:phase6`: **4 passed, 0 failed, about 1.18 seconds**, reported from the user's Windows PowerShell environment against the dedicated PostgreSQL test database, after installing the required inventory function and trigger from `database/triggers.sql`. The current agent environment did not rerun this suite; its test URL and Docker engine were unavailable.
- `npm audit --omit=dev`: 0 production dependency vulnerabilities in the Codex Windows workspace. Full `npm audit`: 5 high-severity development dependency findings remain through `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`, including GHSA-vfj7-8cjw-p6xm.
- No schema migration was needed. The user installed the existing SQL inventory function/trigger on the dedicated test DB; this task did not modify database contents. Production and external database verification remains out of scope and unperformed. No parts catalog/restocking UI is implemented.

---

## 3C. PHASE 7 — INVOICING

`PLAN.md` names Phase 7 “Invoicing” (two tasks) and its functional success criterion is that invoices auto-generate with accurate totals. The plan does not separately specify a PDF, payment collection, invoice terms, or a tax percentage. This implementation uses the existing SQL invoice calculation function and schema; provider/admin issuance is an explicit action after service completion.

| Phase 7 acceptance item | Status | Evidence / boundary |
|---|---|---|
| Generate an invoice for a completed service using labor and consumed parts at their recorded prices. | Implemented and dedicated-PostgreSQL verified | `lib/db.ts` locks the booking/service/part rows and invokes `calculate_invoice_totals(integer)`, which uses labor cost plus `service_parts.quantity * unit_price_at_time`; integration tests verified totals and persisted history. |
| Persist accurate subtotal, tax, total and invoice-to-booking association. | Implemented and dedicated-PostgreSQL verified | The existing invoice table has a unique booking FK, unique invoice number and decimal constraints. Integration tests verified persisted totals and association; existing SQL calculates 18% tax. |
| Atomically issue once and transition `COMPLETED → INVOICED`. | Implemented and dedicated-PostgreSQL verified | Integration tests verified duplicate/concurrent protection and rollback; the transaction locks the booking, inserts the invoice, and conditionally transitions the still-`COMPLETED` booking. |
| Let authorized providers/admins issue invoices and let customers/providers/admins view permitted invoice details. | Implemented; unit tests passed | Provider route/action verifies the signed session and role. Customer list/detail queries are constrained to the authenticated owner; provider/admin access follows the single-service-center model. |
| Payment processing, PDF generation, email notifications. | Outside Phase 7 implementation | Payment processing is excluded by `PLAN.md`. The plan's Phase 7 section does not explicitly require PDF generation; notifications belong to Phase 9. |

**Rules used:** `database/functions.sql` defines `calculate_invoice_totals(p_service_id INTEGER)` returning subtotal, tax, and total. It sums service labor and the saved `unit_price_at_time` values for consumed parts, applies its existing 18% tax rule, and returns `DECIMAL(10,2)` totals. Invoice numbers use `INV-<bookingId>` because no numbering convention existed and the existing unique booking constraint guarantees one invoice per booking. Per the user's selected policy, required `due_date` equals `issued_at`; no payment terms are defined or implemented.

**Phase 7 status:** implemented and verified within the tested invoice scope against the dedicated PostgreSQL test database. The integration suite passed 6/6 after correcting the raw function argument type and selecting the nested service ID in the invoice history query. This verification does not cover production or external databases, which were not accessed.

### Phase 7 verification (2026-10-13)

- `npx prisma generate`: passed in the Codex Windows workspace.
- `npx tsc --noEmit`: passed in the Codex Windows workspace.
- `npm run lint`: passed in the Codex Windows workspace.
- `npm run build`: passed with Next.js 16.4.0 on the elevated retry. The initial sandbox attempt was denied permission to create Next.js's Prisma junction under `.next`.
- `node --test lib/invoicing/invoice-service.test.cjs lib/service-records/service-record-service.test.cjs lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs lib/admin/management.test.cjs lib/booking/phase5-postgres-test-target.test.cjs`: **163 passed, 0 failed** in the Codex Windows workspace (Phase 7 unit tests plus prior service-record, booking, JWT, admin, and test-target regressions).
- Previous PostgreSQL debugging identified Prisma `P2010` / PostgreSQL `42883` because Prisma bound the service ID as `BIGINT` while the canonical function signature is `INTEGER` (`services.id` is `SERIAL`; Prisma `Service.id` is `Int`). The SQL call now explicitly casts the bound ID to `INTEGER`. A subsequent history assertion exposed that the invoice query projection omitted the nested service `id`; the projection now selects it. Both fixes were verified by the passing integration run below.
- `npm run test:integration:phase7`: **6 passed, 0 failed** against the dedicated PostgreSQL test database. Scenarios covered successful invoice totals/persistence, labor-only and zero-cost calculations, duplicate and concurrent issuance, ineligible/missing records, and rollback on invoice insertion failure. This does not verify production/external databases.
- `npm run test:unit:phase7`: **8 passed, 0 failed**.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `git diff --check`: passed; Git emitted LF-to-CRLF line-ending warnings only.
- `npm audit --omit=dev`: registry request failed with `ENOTFOUND registry.npmjs.org`; no current audit result was obtained. An elevated retry was rejected by automatic review because it would send dependency metadata to the external npm registry. The last successful recorded production-only audit reported 0 vulnerabilities; the previous full audit reported 5 high-severity development-dependency findings. Those are historical results, not a fresh audit for this checkpoint.
- No migration or SQL changes were made. The existing production/external database has not been inspected or modified.

Phase 7 files added/changed: `lib/invoicing/invoice-service.ts`, `lib/invoicing/invoice-service.test.cjs`, `lib/invoicing/phase7-postgres.integration.test.cjs`, `lib/db.ts`, `app/dashboard/provider/invoices/actions.ts`, `app/dashboard/provider/invoices/IssueInvoiceForm.tsx`, `app/dashboard/provider/invoices/page.tsx`, `app/dashboard/customer/invoices/page.tsx`, `app/dashboard/invoices/[id]/page.tsx`, provider/customer booking navigation, `package.json`, `README.md`, the PostgreSQL test setup guide, and this status document. Phase 7 is verified for the tested scope against the dedicated PostgreSQL test database; production/external database verification remains outstanding. At the Phase 7 checkpoint, Phase 8 and later were NOT STARTED; current Phase 8 and Phase 9 status is recorded in Sections 3D and 3E.

---

## 3D. PHASE 8 — REVIEWS & RATINGS

`PLAN.md` identifies Phase 8 as “Reviews & Ratings” (two tasks). Its explicit success criterion is **“Reviews submitted for completed services”**; the key feature names a review and rating system. The existing SQL `reviews` table and Prisma `Review` model already provide a unique booking relationship, customer foreign key, 1–5 rating constraint, optional comment, and timestamp. No schema change or migration was needed.

| Phase 8 criterion | Status and evidence |
|---|---|
| Submit a review for a completed service, with 1–5 rating and optional comment linked to the booking. | Implemented; 11 unit tests pass. The server derives customer ID from the verified session, requires an owned booking with a service record and status `COMPLETED` or `INVOICED`, validates rating/comment type, and persists through Prisma. |
| Prevent duplicate reviews and safely handle missing, ineligible, unauthorized, and concurrent submissions. | Implemented; unit tests pass. The unique `reviews.booking_id` constraint is authoritative; concurrent unique conflicts map to a safe duplicate response. |
| Display the customer's review and only offer eligible submission in the booking workflow. | Implemented in the customer-owned booking detail page. Reads are scoped by both booking ID and authenticated customer ID. |
| Verify persistence against PostgreSQL. | Verified against the guarded dedicated PostgreSQL test database; production/external databases were not tested. |

### Phase 8 verification (2026-10-13)

- `npm run test:unit:phase8`: **11 passed, 0 failed** in the Codex Windows workspace.
- Existing booking, JWT, service-record, invoicing, and PostgreSQL target-guard regression tests: **150 passed, 0 failed** in the Codex Windows workspace.
- `npm run test:integration:phase8`: **4 passed, 0 failed** against the guarded dedicated PostgreSQL test database, reported from the user's Windows PowerShell environment. It verified eligible review persistence/customer-scoped retrieval, completed and invoiced eligibility, and ownership, role, input, duplicate, and concurrent-submission constraints.
- `npx tsc --noEmit` and `npm run lint`: passed in the Codex Windows workspace.
- `npm run build`: passed in the user's Windows PowerShell environment.
- `git diff --check`: passed; Git emitted only LF-to-CRLF working-copy warnings.
- PostgreSQL verification used only the guarded dedicated test database. Production/external database verification was not performed.
- No database schema, SQL, migration, dependency, or environment file changes were made for Phase 8.

Files added/changed for this feature: `lib/reviews/review-service.ts`, `lib/reviews/review-service.test.cjs`, `lib/reviews/phase8-postgres.integration.test.cjs`, `lib/db.ts`, `app/dashboard/customer/bookings/actions.ts`, `app/dashboard/customer/bookings/[id]/page.tsx`, `app/dashboard/customer/bookings/[id]/ReviewForm.tsx`, `package.json`, `README.md`, and this status document. Phase 8 is implemented and verified within the tested scope; production/external databases were not tested. At the Phase 8 checkpoint, Phase 9 and later remained NOT STARTED; current Phase 9 status appears in Section 3E.

---

## 3E. PHASE 9 — EMAIL NOTIFICATION SYSTEM

`PLAN.md` describes Phase 9 as “Email Notification System” (three tasks) and the project success criteria say **“Email notifications sent at each stage.”** The plan's roadmap further identifies booking status changes and invoice generation notifications. The implemented customer email events are: pending booking request, confirmation, rejection, customer cancellation, service start, service completion, and invoice issuance. Each message includes booking/service/schedule details; invoice mail also includes its invoice number. Messages have both plain-text and HTML versions, and untrusted text is HTML-escaped.

| Phase 9 acceptance item | Status and evidence |
|---|---|
| Send email at booking lifecycle stages and invoice issuance. | Implemented in booking and invoice Server Actions, after successful database mutations only. Recipients and message details are loaded from persisted Prisma records; status is checked before sending. |
| Keep SMTP settings server-side and handle absent/invalid settings safely. | Implemented in `lib/email.ts`; transport is lazy and reused. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` are server-only settings; optional `SMTP_SECURE` defaults by port. `.env.example` contains placeholders only. Secrets and SMTP responses are not exposed. |
| Avoid making email failures look like failed committed booking/invoice writes. | Implemented. A successful write remains successful and the UI displays a warning if its email could not be sent. Emails are skipped for failed, unauthorized, stale, or invalid-state operations. |
| Verify delivery. | Mock transport tests pass; no real SMTP credentials were used and live SMTP delivery was not tested. |

### Phase 9 verification (2026-10-13)

- `npm run test:unit:phase9`: **10 passed, 0 failed**. Coverage includes optional/invalid config, event templates, escaping, text and HTML output, sender/recipient, transport reuse/failure, trusted recipient selection, event-to-status mapping, failed mutation suppression, invoice mapping, and safe warning behavior.
- `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs lib/service-records/service-record-service.test.cjs lib/invoicing/invoice-service.test.cjs lib/reviews/review-service.test.cjs lib/booking/phase5-postgres-test-target.test.cjs`: **161 passed, 0 failed**.
- `npx tsc --noEmit`: passed. `npm run lint`: passed.
- `npm run test:integration:phase9`: **3 passed, 0 failed** in the user’s PowerShell environment against the guarded dedicated PostgreSQL test database. This verifies the tested database-backed recipient/context workflows, not production or external databases.
- `npm run build`: passed in the user’s PowerShell environment on Next.js 16.4.0.
- `git diff --check`: passed in the user’s PowerShell environment with LF-to-CRLF line-ending warnings only.
- No database schema changes were needed. No real SMTP delivery was attempted.

Delivery is best-effort after the authoritative database transaction. There is no outbox, background queue, or automatic retry, so an SMTP outage or missing configuration can leave a committed lifecycle change without an email; the responsible user receives a visible warning. Deployment still requires valid SMTP host, port, user, app password, and sender address in server environment variables. In-app `notifications` table is not used because the Phase 9 plan calls for email and existing workflow does not require in-app messages.

Phase 9 files added/changed: `lib/email.ts`, `lib/email.test.cjs`, `lib/email-workflows.ts`, `lib/email-workflows.test.cjs`, `lib/email-workflows.postgres.integration.test.cjs`, booking and invoice Server Actions/UI feedback, `lib/booking/booking-service.ts`, `lib/db.ts`, `.env.example`, `package.json`, `README.md`, and this status document. Phase 9 is implemented and verified within its tested scope: unit/regression tests, the guarded dedicated-PostgreSQL context suite, TypeScript, lint, and production build passed. Live SMTP delivery and production/external databases remain unverified. At the Phase 9 checkpoint, Phase 10 was implemented and verified within its tested scope, while Phases 11 and 12 had not started; Phase 11 has since been completed within its tested QA scope, and Phase 12 remains NOT STARTED.

## 3F. PHASE 10 — ADMIN DASHBOARD

`PLAN.md` gives Phase 10 the title “Admin Dashboard” (three tasks) and its explicit success criterion is: **“Admin dashboard provides system oversight.”** The plan does not enumerate individual dashboard metrics. This implementation provides a scoped operational summary for the platform’s single configured service center without adding unrelated reporting features.

| Phase 10 acceptance item | Status and evidence |
|---|---|
| Administrator dashboard provides system oversight. | Implemented at `/dashboard/admin` for the configured service center; shows booking counts by status, total/active mechanic counts, low-stock parts count, paid/unpaid invoice counts and amounts, review count/average rating, and the five most recently scheduled bookings. |
| Restrict dashboard data to administrators. | `/dashboard/admin/page.tsx` requires a signed-in session actor and `ADMIN`; `readAdminDashboard` independently rejects unauthenticated and non-admin actors before repository access. The dashboard link on `/dashboard` is rendered only for an admin actor. |
| Use actual operational data and handle empty/error states. | Prisma database-side `groupBy`, `aggregate`, `count`, and a low-stock aggregate query read existing base tables. Missing booking statuses display as zero; no configured center and database errors return safe messages; the recent-bookings table does not select customer personal information. |

Dashboard values are defined as follows: bookings are counted by persisted status for the configured center; mechanic counts are total and active mechanics for that center; low stock means `stock_quantity <= reorder_threshold`; invoice amounts separately sum `PAID` and `UNPAID` invoices associated with that center; review average/count are scoped through each review’s booking; recent bookings are the five rows ordered by scheduled date descending. Queries aggregate in PostgreSQL and do not join independent collections into a potentially duplicative summary.

The dashboard uses normalized tables through Prisma in `lib/db.ts`; it does not depend on `vw_service_analytics` or `vw_low_stock_parts`, because `database/views.sql` is a separate SQL file and is not guaranteed to be installed in every existing database. No schema change, SQL view, or migration was required. No production or external database was accessed.

### Phase 10 verification (2026-10-13)

- `npm run test:unit:phase10`: **3 passed, 0 failed** (admin authorization, status aggregation/zero defaults, missing center, and safe database-error behavior).
- `npx tsx --test lib/admin/management.test.cjs lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs lib/service-records/service-record-service.test.cjs lib/invoicing/invoice-service.test.cjs lib/reviews/review-service.test.cjs lib/email.test.cjs lib/email-workflows.test.cjs lib/booking/phase5-postgres-test-target.test.cjs`: **184 passed, 0 failed**.
- `npx tsc --noEmit`: passed. `npm run lint`: passed.
- `npm run test:integration:phase10`: **1 passed, 0 failed** against the guarded dedicated PostgreSQL test database in the user's regular Windows PowerShell environment.
- `npm run build`: **passed** with Next.js 16.4.0, including compilation, TypeScript checks, static-page generation, and final optimization, in the user's regular Windows PowerShell environment.
- `git diff --check`: **passed**; Git displayed LF-to-CRLF conversion warnings only, with no reported whitespace errors.
- Production and external databases were not tested. Live SMTP delivery remains untested as a Phase 9 limitation, not a Phase 10 failure.

Phase 10 is **IMPLEMENTED AND VERIFIED WITHIN THE TESTED SCOPE**. Its reported 1/1 PostgreSQL result applies only to the guarded dedicated test database. Production/external databases were not tested. The unrelated lack of live SMTP delivery is a Phase 9 limitation.

Files added/changed for Phase 10: `app/dashboard/admin/page.tsx`, `app/dashboard/admin/loading.tsx`, `app/dashboard/page.tsx`, `lib/admin/dashboard.ts`, `lib/admin/dashboard.test.cjs`, `lib/admin/dashboard-postgres.integration.test.cjs`, `lib/db.ts`, `package.json`, `README.md`, and this status document. Phase 10 is implemented and verified within its tested scope. Production/external databases were not tested. At that checkpoint, Phase 11 and Phase 12 had not started; Phase 11 has since been completed within its tested QA scope, and Phase 12 remains NOT STARTED.

---

## 3G. PHASE 11 — TESTING & QUALITY ASSURANCE

`PLAN.md` assigns three tasks to Phase 11 but gives no task-level descriptions. For this QA pass, the working breakdown is: (1) inventory existing workflow coverage and verification limits, (2) add focused regression coverage for authentication and authorization risks, and (3) rerun the available regression, static, build, database, and security checks. This breakdown does not redefine the approved roadmap.

| QA area | Evidence and current result | Remaining limitation |
|---|---|---|
| Password verification and JWT validity | New password tests cover unique salts, correct/wrong passwords, malformed hashes, and digest-length errors. Existing JWT tests cover signatures, expiration, and malformed tokens. | Password/JWT tests do not prove persisted user authentication. |
| Dashboard route authorization | New Proxy tests cover unauthenticated, malformed/expired sessions, all four roles, permitted route groups, and forbidden cross-role routes. Unknown signed roles now redirect to login. | Server Actions/services still require their own authorization; Proxy coverage is not a substitute. |
| Public registration boundary | New parser and action tests prove role input is ignored, public registration assigns CUSTOMER, malformed fields are rejected, and database exceptions are returned as generic messages. | `db.user` remains a placeholder; registration/login are not PostgreSQL-backed and login does not establish a persisted session. |
| Booking, scheduling, mechanic, service-record, inventory, invoice, review, email, and dashboard logic | Existing mocked/unit and regression suites plus the PostgreSQL safety-target guard are included in the combined command below. The current combined run passed 206/206. | These mocks do not establish a current database integration run. |
| PostgreSQL integration | User ran `npm run test:integration:phase11` in Windows PowerShell: Phase 5 5/5, Phase 6 4/4, Phase 7 6/6, Phase 8 4/4, Phase 9 3/3, Phase 10 1/1; **23 passed, 0 failed across six suites**. | Dedicated local test database only. Production/external database state was not tested. A separate workspace attempt stopped at the explicit guard because its URL variables were unset and Docker was unavailable; it made no database writes. |
| Browser/end-to-end and UI coverage | Added Playwright 1.64.1 and Chromium. Seven browser tests passed against a local Next server: login form/navigation, unauthenticated redirect, malformed/expired cookie rejection, customer route denial, and role access to provider, customer-booking, and admin pages. | Synthetic test-only JWT cookies exercise route gates, not persisted login. Data-backed pages show their safe load-error state because the test server uses an unreachable loopback database URL. No booking persistence, customer data isolation, mutation authorization, or live database journey is verified. Authentication persistence and vehicle CRUD remain placeholders. |
| Build, types, lint, and dependency audit | Phase 11 focused and combined tests, TypeScript, ESLint, and production build passed in this workspace. Fresh audits were run with registry access: production-only audit has 0 findings; full audit has 5 high findings in development dependencies. | The shared `braces` advisory has no compatible fix; npm's suggested `eslint-config-next@14.2.35` is a breaking downgrade. No dependency remediation was applied. Production/external databases remain untested. |

### Phase 11 verification (2026-10-20)

The six PostgreSQL suite results are user-confirmed Windows PowerShell evidence. The other test/check results below were executed in this workspace on 2026-10-20, except where explicitly identified as user-reported. Browser E2E ran with the test server forced to an unreachable loopback database URL; audit commands used the reachable npm registry.

- `npm run test:unit:phase11`: **19 passed, 0 failed**. Includes password verification, legacy ownership checks, Proxy role routing, registration input/role enforcement, and generic auth error handling.
- Combined unit/mock/regression command: `npx tsx --test lib/booking/booking-service.test.cjs lib/booking/phase5-postgres-test-target.test.cjs lib/auth/jwt.test.cjs lib/auth/legacy-ownership.test.cjs lib/auth/password.test.cjs lib/auth/proxy.test.cjs lib/auth/registration-input.test.cjs lib/auth/actions.test.cjs lib/admin/management.test.cjs lib/service-records/service-record-service.test.cjs lib/invoicing/invoice-service.test.cjs lib/reviews/review-service.test.cjs lib/email.test.cjs lib/email-workflows.test.cjs lib/admin/dashboard.test.cjs` — **206 passed, 0 failed**.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.4.0, including compilation, type checks, static page generation, and optimization.
- `npm run test:e2e`: **7 passed, 0 failed** in Chromium 156 on the local Next development server. The test server receives only test-only JWT settings and an intentionally unreachable `127.0.0.1:1` database URL. The first sandboxed attempt was blocked by Windows junction permissions; the successful local rerun had the required permission. No production or configured PostgreSQL database was accessed by these browser tests.
- `npm audit --omit=dev`: passed with **0 vulnerabilities** in production dependencies (exit 0).
- `npm audit`: **5 high, 0 other findings** in the development dependency chain (`@next/eslint-plugin-next`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`; exit 1). The dependency path is `eslint-config-next@16.4.0` → `@next/eslint-plugin-next@16.4.0` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`. `npm audit fix --dry-run` proposed only the major downgrade to `eslint-config-next@14.2.35`; no fix was applied. The upstream `braces` advisory has no patched release, so there is no compatible override/remediation identified.
- `git diff --check`: passed; Git emitted LF-to-CRLF working-copy warnings only.
- User-reported Windows PowerShell result for `npm run test:integration:phase11`: **six suites passed, 23 passed, 0 failed** (Phase 5 5/5, Phase 6 4/4, Phase 7 6/6, Phase 8 4/4, Phase 9 3/3, Phase 10 1/1), using the guarded dedicated local PostgreSQL database. Production/external database state remains unverified.
- A separate attempt in this workspace stopped at Phase 5's explicit missing-`PHASE5_TEST_DATABASE_URL` guard before connecting; Docker Desktop's Linux engine pipe was unavailable. No database was reset or initialized, and no writes were made in this workspace.
- The first `npm run test:e2e` attempt in the restricted sandbox failed before tests because Next.js could not create its temporary Prisma junction (Windows access denied). The rerun with local junction permission passed 7/7. This is recorded to distinguish the successful result from the infrastructure-only failed attempt.

### Defects reproduced and corrected

- `proxy.ts` accepted any truthy signed role at `/dashboard`; it now accepts only roles in Prisma's `UserRole` enum. Tests cover valid and invalid roles and route-group boundaries.
- Public registration accepted a client-supplied role, including ADMIN/SERVICE_PROVIDER. Registration now validates and normalizes public input, discards unknown fields, and always assigns CUSTOMER; the role chooser was removed from the public registration page. Tests exercise both the parser and server action.
- Registration/login actions previously returned raw exception messages. They now return generic safe failures; regression tests verify database details do not escape.
- The unused legacy vehicle-ownership helper previously failed to verify customer/fleet-manager ownership. It now validates IDs and checks repository ownership; focused tests cover owner matches, mismatches, invalid IDs, and privileged roles.

**Phase 11 status: COMPLETE within the defined tested QA scope.** The defined QA work—coverage inventory, focused authentication/authorization regression tests, available regression/static/build/database/security checks, and browser tests for feasible route/auth behaviors—is complete. Evidence: 19 focused tests, 206 combined unit/mock/regression tests, 23 user-reported PostgreSQL integration tests across six guarded suites, and 7 local Playwright tests passed; TypeScript, ESLint, and production build passed. Fresh production-only audit found 0 vulnerabilities; the full audit reports 5 high development dependency findings with no compatible upstream fix, documented as residual risk. The Playwright suite uses synthetic test-only JWT cookies and a deliberately unreachable database; it does not prove persisted login, customer-data isolation, booking writes, or database-backed journeys. Those remain outside this QA closeout because Phase 2 authentication persistence and Phase 3 vehicle CRUD are incomplete. Production/external databases were not tested, and live SMTP remains untested as a Phase 9 limitation. Phase 12 remains NOT STARTED. See [docs/phase-11-qa.md](docs/phase-11-qa.md).

---

## 4. IMPLEMENTATION RECORD (MIXED COMPLETION STATUS)

### Phase 1 — Foundation & Infrastructure

**Database schema** (`database/schema.sql`):
- SQL-first 3NF normalized schema with all core tables
- Custom enums: `user_role`, `booking_status`, `invoice_status`
- Tables: users, vehicles, service_center, mechanics, service_types, parts, bookings, services, service_parts, invoices, reviews, notifications, audit_logs
- Constraints, check conditions, foreign keys with ON DELETE cascades

**Prisma configuration** (`prisma/schema.prisma`):
- Maps to SQL-first approach
- `prisma-client-js` generator
- Datasource PostgreSQL from env `DATABASE_URL`

**Environment configuration** (`.env.example`):
- `DATABASE_URL` — PostgreSQL connection
- `JWT_SECRET` — JWT signing key
- Nodemailer SMTP settings

**Base Next.js application**:
- Next.js 16 with App Router
- TypeScript strict mode
- Tailwind CSS / custom styling
- `app/layout.tsx`, `app/globals.css`

**Status boundary**: the SQL schema and application foundation are present. Their presence is not evidence that every SQL object is installed on production/external databases or that all advanced SQL/reporting requirements are exercised by the application. Prisma is used both for typed access in implemented workflows and for client generation; SQL files remain the schema/function/trigger source of truth.

---

### Phase 2 — Authentication & RBAC

**Authentication flow**:
```text
Registration
    ↓
Password hashing (Node.js crypto PBKDF2-SHA512 with salt)
    ↓
User record (id, name, email, password_hash, role, phone, created_at, updated_at)
    ↓
Login
    ↓
JWT session (signed via jose)
    ↓
HTTP-only cookie (apex_session)
    ↓
Server-side session verification (JWT verification)
    ↓
Proxy route checks plus Server Action/service authorization and ownership checks
```

**Key files**:
- `lib/auth/password.ts` — `hashPassword`, `verifyPassword`
- `lib/auth/jwt.ts` — `signToken`, `verifyToken`, `JWTPayload`
- `lib/auth/session.ts` — `getCurrentUserFromHeaders`, `UserRole` enum, cookie operations
- `lib/auth/actions.ts` — `loginUser`, `logoutUser` Server Actions
- `proxy.ts` — Dashboard route guard: `/dashboard/admin` → ADMIN, `/dashboard/provider` → SERVICE_PROVIDER/ADMIN, `/dashboard/customer` → CUSTOMER/FLEET_MANAGER/ADMIN. Mutations still require their own server-side checks.
- `lib/auth/permissions.ts` — `checkRole`, `verifyVehicleOwnership` server-side helpers

**RBAC roles**: `CUSTOMER`, `SERVICE_PROVIDER`, `FLEET_MANAGER`, `ADMIN`. Effective access is limited to the route guards and feature-specific server checks that are implemented. This is not a claim of complete role-wide CRUD; user and vehicle persistence remain incomplete.

**Implemented security primitives**:
- Node.js crypto PBKDF2-SHA512 password hashing (10,000 iterations)
- JWT access tokens with expiration
- HTTP-only session cookie (`apex_session`)
- Role-based Proxy protection and server-side checks in feature services/actions
- Password reset is not implemented

**Persistence limitation**: the current `db.user.findUnique`/`create` methods in `lib/db.ts` are placeholders (lookup returns `null`, create returns a fabricated record). Registration/login are therefore not an end-to-end PostgreSQL-backed authentication flow. The standalone JWT tests verify token logic, not persisted authentication or all RBAC paths. Phase 2 is partial, not complete.

---

### Phase 3 — Vehicle Management

**Vehicle route and form scaffolding** (not a completed PostgreSQL-backed CRUD feature):

- **Vehicle listing route** — `/dashboard/customer/vehicles` — current page is placeholder UI
- **Add vehicle form** — `/dashboard/customer/vehicles/new` — submits through a placeholder adapter and fixed owner ID; not persisted or owner-enforced
- **Vehicle detail/edit routes** — UI files exist; they do not establish working PostgreSQL CRUD

- **Delete behavior** — no persisted dependent-record protection is established

**Key files**:
- `app/dashboard/customer/vehicles/page.tsx` — vehicle list page
- `app/dashboard/customer/vehicles/[id]/edit/page.tsx` — edit vehicle
- `app/dashboard/customer/vehicles/new/page.tsx` — new vehicle form
- `lib/db.ts` — vehicle CRUD methods (findUnique, create, updateVehicle, deleteVehicle)
- `lib/auth/permissions.ts` — `verifyVehicleOwnership`

The current vehicle list is placeholder UI. The add page is a client component that submits a hard-coded `ownerId: 1` to the placeholder `db.vehicle.create`; the vehicle read/create/update/delete methods in `lib/db.ts` are not Prisma persistence. Consequently, no persisted owner-scoped vehicle CRUD or IDOR prevention is established by the current implementation. Do not treat the old route descriptions below as proof of working vehicle operations.

**Intended validation fields in the current form**:
- Required fields: make, model, year, license_plate
- Year constraint: 1900 <= year <= 2100
- license_plate UNIQUE constraint
- mileage >= 0

**Schema**: the SQL `vehicles` table and Prisma model define owner and vehicle columns/relations, but current UI/adapter code does not use Prisma for vehicle persistence. No dedicated PostgreSQL vehicle CRUD verification is recorded. Phase 3 is partial.

---

### Phase 4A — Service Center Management

**Service center view/edit** with a PostgreSQL-backed admin-only path:

- **Service center view and edit** — `/dashboard/admin/service-center` — reads and updates the current database record
- **Admin-only access** — Proxy, page, management service, and Server Action enforce ADMIN role
- **Reuse existing `service_center` schema** — no redesign needed

**Key implementation**:
- `app/dashboard/admin/service-center/page.tsx` — service center management page
- `lib/db.ts` — Prisma `findCurrent` and `updateCurrent` methods use the service-center table

**Service center schema** (from `database/schema.sql`):
```sql
CREATE TABLE service_center (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    operating_hours VARCHAR(100) DEFAULT 'Mon-Sat 8:00 AM - 6:00 PM',
    time_zone VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Prisma model** (`prisma/schema.prisma`):
- `ServiceCenter` maps directly to SQL table
- Fields: id, name, address, phone, email, operatingHours, timeZone, createdAt, updatedAt
- Relations: mechanics (Mechanic[]), bookings (Booking[])

**Status**: Admin-only page reads the current center from Prisma/PostgreSQL and edits name, address, phone, email, and legacy operating-hours text. A server action rechecks the signed-in ADMIN role, validates fields, and updates only the current center's editable columns; ID, timezone, and normalized weekly schedule are protected. Schedule settings remain on the separate schedule page. PostgreSQL connectivity was not available during this task's verification. Later booking and dashboard integration suites used the dedicated PostgreSQL test database, but they do not constitute dedicated CRUD integration verification for these management screens.

---

### Phase 4B — Mechanic Management

**Mechanic CRUD** for admin-only access:

- **Mechanic management** — `/dashboard/admin/mechanics` — creates, lists, edits, deactivates, and safely deletes mechanics
- **Admin-only access** — Proxy, server page, management service, and every mutation enforce ADMIN role
- **Service-center association** — mechanics linked to existing service center via `service_center_id`

**Key implementation**:
- `app/dashboard/admin/mechanics/page.tsx` — Prisma-backed mechanic management page
- `lib/db.ts` — center-scoped Prisma list/create/update and history-preserving delete-or-deactivate operations

**Mechanic schema** (from `database/schema.sql`):
```sql
CREATE TABLE mechanics (
    id SERIAL PRIMARY KEY,
    service_center_id INTEGER NOT NULL REFERENCES service_center(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Prisma model** (`prisma/schema.prisma`):
- `Mechanic` maps directly to SQL table
- Fields: id, serviceCenterId, name, specialization, phone, isActive, createdAt, updatedAt
- Relations: serviceCenter (ServiceCenter), bookings (Booking[]), services (Service[])

**Current functionality**:
- Listing, creation, and updates use Prisma and are scoped to the configured single service center; the server derives the center ID and ignores client-supplied relationship identifiers.
- Name, specialization, phone, and active status are validated server-side against schema limits. Missing records and database errors have safe responses; pages include loading, empty, and error states.
- A delete request hard-deletes only a mechanic with no booking or service references. Referenced mechanics are marked inactive to retain historical links; the transaction locks the service-center row and mechanic row to serialize with assignments and protect against concurrent references.
- Live database connectivity was not verified because `DATABASE_URL` is unavailable in this environment.

---

## 5. TECHNOLOGY STACK

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 16.4.0 (App Router), React 19.3.0, TypeScript | App Router pages, Server Components, Client Components |
| **Styling** | Custom CSS, inline styles, Tailwind CSS dependency | Mixed patterns; no consistent design system |
| **Backend** | Next.js 16 App Router, Server Actions, Node.js Proxy | Route handlers, form submissions, dashboard route guard |
| **Database** | PostgreSQL 14+ (SQL-First) | All schemas in `database/*.sql`, Prisma for type generation |
| **ORM** | Prisma | Type-safe PostgreSQL access in implemented workflows and client generation; SQL files remain the schema/migration source of truth |
| **Authentication** | Node.js crypto PBKDF2, jose (JWT), HTTP-only cookies | JWT/password primitives exist; persisted user adapter remains a placeholder |
| **Validation** | Zod, React Hook Form | Installed dependencies; usage varies by feature |
| **Email** | Nodemailer (SMTP) | Phase 9 workflow integrated; live SMTP delivery untested |
| **Testing** | Node.js built-in test runner, `tsx`, Playwright 1.64.1 | Focused `.test.cjs` unit/mock, guarded PostgreSQL integration, and limited local Chromium route/auth E2E; Jest and React Testing Library are not configured |
| **Deployment** | Vercel (frontend), PostgreSQL hosting | Not yet configured |

**Exact versions**:
- Next.js: 16.4.0
- React / React DOM: 19.3.0
- ESLint: 9.39.5 (latest peer-compatible major supported by the bundled Next.js ESLint plugins)
- eslint-config-next: 16.4.0
- TypeScript: 5.9.3
- Prisma: ^5.19.0
- jose: ^5.8.0
- Tailwind CSS: 4.3.3 (dependency; custom CSS and inline styles are also used)
- Nodemailer: 10.0.16

---

## 6. DATABASE ARCHITECTURE

### SQL-First Approach
- **Source of truth**: SQL schema, functions, triggers, views, indexes, and forward-only migration files under `database/`.
- **Prisma integration**: `prisma/schema.prisma` maps the database and Prisma provides type-safe data access in implemented workflows; it is not the migration source of truth.
- **Database state**: the documented integration runs target the disposable dedicated PostgreSQL test DB only. Production/external schema and migration state have not been inspected.

### PostgreSQL Tables (from `database/schema.sql`)

| Table | Key Fields | Constraints |
|---|---|---|
| **users** | id, email, password_hash, role, phone, created_at, updated_at | role ENUM, email UNIQUE, password_hash NOT NULL |
| **vehicles** | id, owner_id, make, model, year, license_plate, vin, mileage | owner_id FK → users, license_plate UNIQUE, year CHECK |
| **service_center** | id, name, address, phone, email, operating_hours, time_zone | `time_zone` is nullable in schema; scheduling requires an explicitly configured center timezone |
| **service_center_hours** | service_center_id, day_of_week, opens_at, closes_at | normalized weekly opening windows; one or more windows per day |
| **mechanics** | id, service_center_id, name, specialization, phone, is_active | service_center FK → ON DELETE CASCADE |
| **service_types** | id, name, description, base_price, estimated_duration_minutes | name UNIQUE, base_price >= 0, duration > 0 |
| **parts** | id, name, part_number, description, unit_price, stock_quantity, reorder_threshold | part_number UNIQUE, stock_quantity >= 0 |
| **bookings** | id, customer_id, vehicle_id, service_type_id, mechanic_id, service_center_id, status, scheduled_date | FKs to users/vehicles/service_types/mechanics/service_center, status ENUM |
| **services** | id, booking_id, mechanic_id, diagnosis_notes, work_performed, labor_cost, started_at, completed_at | booking FK unique, labor_cost >= 0 |
| **service_parts** | id, service_id, part_id, quantity, unit_price_at_time | composite lookups, stock deduction |
| **invoices** | id, booking_id, invoice_number, subtotal, tax, total_amount, status | booking FK unique, invoice_number UNIQUE; issued for completed service records |
| **reviews** | id, booking_id, customer_id, rating, comment, created_at | booking FK unique, rating range |
| **notifications** | id, user_id, title, message, is_read, sent_at | user FK, is_read default false |
| **audit_logs** | id, table_name, record_id, action, changed_by, details, logged_at | changed_by FK → users, action ENUM |

### SQL Functions (`database/functions.sql`)
- `calculate_invoice_totals(p_service_id INTEGER) → TABLE(calculated_subtotal DECIMAL(10,2), calculated_tax DECIMAL(10,2), calculated_total DECIMAL(10,2))` — sums recorded labor and consumed-part snapshot prices, then applies the existing 18% tax rule
- `update_updated_at_column() → TRIGGER` — update timestamps for tables with timestamp triggers

### Triggers (`database/triggers.sql`)
- `update_*_updated_at` triggers call `update_updated_at_column()` before update
- `trg_deduct_inventory` fires after `service_parts` inserts to deduct stock
- `update_invoices_updated_at` maintains invoice update timestamps

### Views (`database/views.sql`)
- `vw_customer_booking_history` — customer's booking history summary
- `vw_low_stock_parts` — parts below reorder threshold
- `vw_service_analytics` — service center analytics (revenue, bookings, mechanics workload)

### Indexes (`database/indexes.sql`)
- Indexes on foreign keys: `owner_id`, `service_center_id`, `mechanic_id`, `booking_id`
- Unique indexes: `email`, `license_plate`, `part_number`, `invoice_number`
- Performance indexes: status fields, date ranges, lookup columns

### Analytics (`database/analytics.sql`)
- SQL examples define CTE/window-function analytics for monthly revenue growth, mechanic workload ranking, and low-stock detection.
- These analytics are not integrated into the Phase 10 dashboard; only the dashboard metrics listed in Section 3F are implemented. Existing SQL views/analytics are not assumed installed on arbitrary databases.

### Seed Data (`database/seed.sql`)
- Sample users with all 4 roles
- Sample service center
- Sample mechanics
- Sample vehicles, bookings, services, parts
- Sample invoices and reviews

---

## 7. AUTHENTICATION ARCHITECTURE

### Implemented primitives

- `lib/auth/password.ts`: Node.js crypto PBKDF2-SHA512 hashing and timing-safe verification (10,000 iterations).
- `lib/auth/jwt.ts`: `jose` HS256 signing and verification with expiration.
- `lib/auth/actions.ts`: login/register/logout Server Actions; cookie handling uses an HTTP-only `apex_session` cookie.
- `proxy.ts`: gates `/dashboard/*` URL prefixes using the signed token role. This is not a substitute for authorization in Server Actions/services.
- Implemented domain services/actions derive identity and enforce role/ownership checks for their covered operations.

### Current limitation

`lib/db.ts`'s user lookup returns `null` and user creation returns a fabricated record. The Server Actions therefore do not provide working PostgreSQL-backed registration/login. `getCurrentUserFromHeaders` also relies on this placeholder lookup. The JWT suite verifies token behavior only; it does not verify persisted authentication or all role paths. A development fallback JWT secret remains in code/example configuration and must never be used for deployment. Phase 2 is partial.

---

## 8. ROLE MODEL

### Implemented Roles & Permissions

| Role | Can Access | Can Manage |
|---|---|---|
| **ADMIN** | Admin, provider, and customer dashboard prefixes allowed by `proxy.ts` | Implemented admin and provider operations where server handlers allow them |
| **SERVICE_PROVIDER** | `/dashboard/provider` | Provider booking, service-record, and invoice operations after server checks |
| **FLEET_MANAGER** | `/dashboard/customer` | Customer booking routes; vehicle persistence is incomplete |
| **CUSTOMER** | `/dashboard/customer` | Customer booking routes; vehicle persistence is incomplete |

### Permission enforcement:
- **Server-side only**: Never trust client-supplied role
- **Proxy**: `proxy.ts` gates dashboard routes by signed JWT role; it is not a substitute for authorization in mutations.
- **Server features**: implemented Server Actions/services repeat role and ownership checks where applicable; legacy vehicle/user adapters remain incomplete.
- **Database-level**: foreign keys and constraints protect relational integrity; application checks enforce role/ownership policies.

---

## 9. CURRENT APPLICATION ROUTES

```text
/public routes
──────────────────
/                — Landing / Home page
/login           — Login page (unauthenticated only)
/register        — Register page (unauthenticated only)

/dashboard routes (protected, auth required)
──────────────────────────────────────────────
/dashboard       — Dashboard redirect (role-based)
/dashboard/admin — ADMIN only (Proxy and server page)
  ├── / — operational admin dashboard (Phase 10)
  ├── /service-center — Service center management
  │   └── /schedule — configure timezone and weekly booking hours (Phase 4C.10)
  └── /mechanics — Mechanic management
/dashboard/provider — SERVICE_PROVIDER or ADMIN
  — Provider landing page
  └── /bookings — PENDING queue with server-authorized confirm/reject actions (Phase 4C.5–4C.7)
      ├── /confirmed — CONFIRMED queue with mechanic assignment and Start Service actions (Phases 4C.8–4C.9)
      └── /in-progress — IN_PROGRESS queue with server-authorized completion action (Phase 4C.12)
/dashboard/customer — CUSTOMER or FLEET_MANAGER
  ├── /vehicles — vehicle UI scaffolding (persistence incomplete)
  └── /bookings
      ├── /new — create a PENDING booking using server-checked available slots (Phases 4C.1, 4C.10)
      └── /[id] — view an owned booking; edit notes or reschedule while PENDING (Phases 4C.4, 4C.11)
/dashboard/service-records — service history page
/dashboard/provider/invoices — provider/admin invoice list and issuance
/dashboard/customer/invoices — customer-scoped invoice list
/dashboard/invoices/[id] — authorized invoice detail
```

**Protected routes**: `proxy.ts` gates `/dashboard/*`; implemented server pages/actions/services repeat role, identity, and ownership checks. Legacy vehicle routes do not currently provide complete persisted ownership-safe operations.

**Route guards** (`proxy.ts`):
- No `apex_session` cookie → redirect to `/login`
- Invalid token → redirect to `/login`
- Wrong role for route → redirect to `/dashboard`

---

## 10. CURRENT FILE / ARCHITECTURE MAP

Current application routing uses `app/` directly; there are no `app/(dashboard)` or `app/api/` route groups in the current tree. Server Components render pages, Server Actions handle mutations, feature services enforce business rules, and `proxy.ts` gates dashboard URL prefixes.

```text
app/
├── login/ and register/
├── dashboard/
│   ├── admin/ (dashboard, service-center, schedule, mechanics)
│   ├── customer/ (bookings and vehicle UI scaffolding)
│   ├── provider/ (bookings, service completion, invoices)
│   ├── invoices/[id]/
│   └── service-records/
├── layout.tsx, globals.css, page.tsx
lib/
├── admin/ (management, dashboard, sessions, tests)
├── auth/ (password, JWT, session, actions, permissions)
├── booking/ (service, scheduling, unit and PostgreSQL tests)
├── invoicing/, reviews/, service-records/
├── email.ts, email-workflows.ts and tests
└── db.ts (Prisma-backed feature repositories; legacy user/vehicle adapters are placeholders)
database/ (schema.sql, migrations/, functions.sql, triggers.sql, views.sql, indexes.sql, analytics.sql, seed.sql)
prisma/schema.prisma
proxy.ts
```

`database/schema.sql` is destructive and must only be used for a newly created disposable database. `docs/phase-5-postgres-test-setup.md` documents guarded local test setup. Dedicated integration runs do not establish production/external database state.

---

## 11. REMAINING IMPLEMENTATION AND VERIFICATION LIMITS

- **Phase 2 authentication persistence** — PARTIAL: `lib/db.ts` user lookup returns `null` and user creation returns a fabricated record. JWT/password primitives and Proxy checks exist, but persisted registration/login is incomplete and unverified.
- **Phase 3 vehicle management** — PARTIAL: current list is placeholder UI and the add form supplies a fixed `ownerId`; `db.vehicle` CRUD methods are placeholders, not PostgreSQL persistence or owner-scoped CRUD.
- **Mechanic shift calendars** — NOT IMPLEMENTED: appointment capacity uses active mechanics as center-wide capacity; individual shifts are not modeled.
- **Parts catalog/restocking UI** — NOT IMPLEMENTED: Phase 6 covers service records and consumed parts/stock deduction only.
- **Payments** — NOT IMPLEMENTED and excluded by `PLAN.md`; the project implements invoices without payment processing.
- **Live SMTP delivery, outbox, and automatic retry** — SMTP has not been live-tested; delivery is best-effort after commit and there is no durable outbox or automatic retry.
- **Production/external database verification** — NOT DONE: the recorded PostgreSQL integration suites use the dedicated test DB and do not verify production/external schema, migration, or runtime state.
- **Phase 11 Testing & Quality Assurance** — COMPLETE within its defined tested scope. Focused/combined runs passed 19/19 and 206/206; the user-reported Phase 5–10 integration suites passed 23/23 against the dedicated local PostgreSQL database; seven Playwright route/auth tests passed against a local server; TypeScript, ESLint, and production build passed. Residual limitations: authentication persistence and vehicle CRUD are incomplete; E2E does not establish customer-data isolation or persisted workflows; production/external DBs remain untested; five high development dependency audit findings remain without a compatible fix.
- **UI polish/deployment hardening (Phase 12)** — NOT STARTED; deployment configuration and production-readiness review are not complete.
- **Analytics beyond the Phase 10 operational dashboard** — NOT INTEGRATED: SQL views and CTE/window-function examples exist, but the dashboard does not use them; no installation is assumed on arbitrary databases.

---

## 12. CURRENT STOP POINT

```text
## CURRENT STOP POINT
```

This is the current stop point, not a claim that all product requirements or production readiness are complete. Phase 2 authentication persistence and Phase 3 vehicle CRUD remain partial. Phase 4A/4B service-center and mechanic features have mocked management coverage (13 tests), while dedicated PostgreSQL CRUD verification is not recorded. Phase 4C.1–4C.12 and the implemented Phase 6 service-record/parts-consumption scope have dedicated PostgreSQL evidence. Phase 7 invoicing is verified within tested scope by six dedicated PostgreSQL integration tests and eight unit tests. Phase 8 reviews passed 11 unit, 150 regression, and 4 dedicated PostgreSQL integration tests. Phase 9 email behavior passed 10 unit, 161 regression, and 3 guarded PostgreSQL context tests; live SMTP remains untested and delivery is best-effort without outbox/retry. Phase 10 admin dashboard passed 3 unit, 184 regression, and 1 guarded dedicated-PostgreSQL integration test. Phase 11 is COMPLETE within its defined tested QA scope: 19 focused tests, 206 combined unit/mock/regression tests, 23 dedicated PostgreSQL integration tests across six Phase 5–10 suites, and 7 local Playwright route/auth tests; TypeScript, lint, production build, and both audits were run in this workspace. The production-only audit had 0 findings; the full audit retains 5 high development dependency findings. Browser E2E does not validate persisted login, customer data isolation, booking writes, or live database behavior. All recorded PostgreSQL results apply only to the dedicated test database; production/external databases were not tested. Phase 12 remains NOT STARTED.

- Customers can submit a new booking request for their own vehicle and an existing service type. Requests are created with `PENDING` status.
- Booking creation and Phase 4 service-center/mechanic management use Prisma against PostgreSQL. Legacy user and vehicle adapters in `lib/db.ts` still contain placeholders; booking and management writes do not use in-memory data.
- Admin service-center management at `/dashboard/admin/service-center` reads the configured record from Prisma and saves validated name, address, phone, email, and operating-hours values. The server action checks the signed session role and updates only the current center's allowed columns; it cannot change the center ID, timezone, or structured schedule. The appointment scheduling page remains separate and unchanged.
- Admin mechanic management at `/dashboard/admin/mechanics` lists actual mechanics for the configured center and provides create, edit, active-status, and delete/deactivate flows. Server actions validate fields, derive the service-center ID from the database, and scope writes to it. The protected page/action path enforces ADMIN regardless of Proxy visibility.
- Mechanic delete preserves historical booking/service links: unreferenced records are deleted; records referenced by bookings or services are deactivated instead. Persistence is serialized with scheduling/assignment through the service-center lock, and the mechanic row is locked before dependency checks.
- Phase 4 service-center/mechanic management tests use mock repositories to verify input, role, scope, and history-preservation logic; that admin CRUD path has not been verified against PostgreSQL. The booking lifecycle has separate dedicated-database integration evidence summarized in the Phase 5 checklist below.
- The latest execution shell cannot make a database connection (`PHASE5_TEST_DATABASE_URL` and `DATABASE_URL` are unset and `127.0.0.1:55432` is unreachable). The previously recorded dedicated Phase 5 PostgreSQL run passed 5/5; no production or external database was tested.
- The customer booking list is server rendered and queries Prisma/PostgreSQL with a `customerId` filter derived from the signed session. It shows booking ID, vehicle, service, requested date, status, and creation date.
- The customer booking details page queries by both booking ID and customer ID from the signed session. It shows schema-backed booking, vehicle, service type, service center, dates, status, and optional notes. A mismatched customer/booking pair returns not found.
- Booking listing has empty, loading, and safe error states.
- Customers can cancel only their own `PENDING` booking. The details page asks for confirmation and hides the control after status changes. Confirmed, in-progress, completed, invoiced, and already cancelled bookings cannot be cancelled through this operation.
- Cancellation checks session and customer/fleet-manager role server-side. A single conditional update matches booking ID, session customer ID, and `PENDING` status, then writes `CANCELLED`. Missing or non-pending bookings receive safe results; the client cannot supply customer ID or target status.
- Service providers and admins can view `/dashboard/provider/bookings`. The server page verifies the signed session and allowlists these two roles; the booking service repeats the role check. Prisma filters `PENDING` in the database and selects only booking ID/status/dates, customer name, vehicle make/model/plate, and service name, ordered newest first. The UI has loading, empty, and safe error states plus a confirm action for each pending request.
- Queue tests use an in-memory repository and verify both allowed roles, forbidden roles, unauthenticated access, database-side pending filter, empty/error states, and safe selected fields. They do not prove live persistence.
- Service providers and admins can confirm a pending booking from the provider queue. A Server Action verifies the signed session; the booking service repeats the role and input checks. Prisma atomically updates only the matching booking ID still in `PENDING` to `CONFIRMED`; an unsuccessful conditional update checks current existence/status to distinguish not-found from stale/non-pending state. The queue is revalidated and refreshed after success.
- Confirmation unit tests cover both allowed roles, unauthenticated/CUSTOMER/FLEET_MANAGER denial, invalid IDs, nonexistent/non-pending bookings, concurrent stale requests, and safe database errors using an in-memory repository. Persistence/lifecycle behavior was separately exercised by the recorded Phase 5 PostgreSQL integration suite (5/5); an earlier Codex-shell rerun attempt was blocked at the target guard.
- Service providers and admins can reject a pending booking from the same queue. The separate Server Action re-verifies the signed session, and the booking service enforces role and input validation. Prisma conditionally updates only an ID still in `PENDING` to `REJECTED`; missing and stale/non-pending states and database errors return safe results. Successful rejection revalidates and refreshes the queue.
- Rejection unit tests cover both allowed roles, denied roles, invalid/missing/non-pending bookings, concurrent requests, and safe DB errors. They verify rejection uses `REJECTED` and does not use `CANCELLED`; database persistence is covered separately by the recorded Phase 5 PostgreSQL integration suite (5/5).
- Service providers and admins can review only `CONFIRMED` bookings at `/dashboard/provider/bookings/confirmed` and start service. The page and service enforce the signed-in role; Prisma filters the list by `CONFIRMED`, and an atomic conditional update changes only a still-confirmed booking to `IN_PROGRESS`. Missing, stale, unauthorized, and database-error cases return safe results. Success revalidates the confirmed and provider booking routes.
- Start-service unit tests cover both allowed roles, denied roles, invalid/missing IDs, confirmed-only state transitions, stale/concurrent attempts, and database errors. The recorded Phase 5 PostgreSQL integration suite (5/5) separately verifies booking persistence/lifecycle; a prior rerun was blocked before connecting and has since been superseded by the successful six-suite Phase 11 run recorded in Section 3G.
- Service providers and admins can assign an active mechanic to an unassigned `CONFIRMED` booking on `/dashboard/provider/bookings/confirmed`. The server derives identity and role from the verified session, validates the booking and mechanic, and requires the mechanic to belong to the booking's service center. The provider view reads active mechanic records from PostgreSQL and displays the assigned mechanic after refresh.
- Assignment persistence uses a parameterized PostgreSQL update that requires the booking to remain `CONFIRMED` and unassigned and the mechanic to remain active and in the same service center. Concurrent or stale requests cannot overwrite an assignment or assign after the booking changes state. Phase 4C.10 additionally prevents assigning the same mechanic to overlapping appointments. No schema migration was needed for the original assignment feature; the existing nullable `mechanic_id` foreign key and service-center relationships support it.
- Mechanic-assignment unit tests cover SERVICE_PROVIDER/ADMIN authorization, unauthenticated/CUSTOMER/FLEET_MANAGER denial, invalid/missing booking and mechanic IDs, inactive/incompatible mechanics, non-confirmed/already-assigned bookings, concurrent attempts, and safe database errors. The recorded PostgreSQL integration suite separately verifies persisted booking lifecycle behavior in the dedicated test database; it does not verify production/external databases.
- Providers and admins can view `/dashboard/provider/bookings/in-progress` and complete only `IN_PROGRESS` bookings. The current Phase 6 provider completion form records service details and consumed parts; a single PostgreSQL transaction creates the service record, deducts inventory through the SQL trigger, and completes the booking. The server verifies the signed session and role, validates input, and handles stale or failed operations safely. Successful updates revalidate the in-progress, confirmed, and pending provider routes.
- The original Phase 4C.12 unit tests cover SERVICE_PROVIDER/ADMIN access, unauthenticated/CUSTOMER/FLEET_MANAGER denial, invalid/missing/non-IN_PROGRESS bookings, concurrent requests, list filtering, and safe database errors. The Phase 6 unit/regression suite passed 155/155, and its PostgreSQL integration suite passed 4/4 in the user's Windows PowerShell environment, covering service-record persistence, stock deduction, insufficient-stock rollback, and concurrent completion protection. Production/external database state remains unverified.
- Phase 4C.10 adds center-local timezone and normalized weekly hours, with a schedule configuration page restricted to ADMIN. Exact-default free-text operating hours are backfilled by the migration; custom text schedules are left unconverted for explicit admin configuration, and scheduling requires an explicit timezone before availability is offered.
- Available appointment starts are shown every 15 minutes. Service duration is taken from `service_types.estimated_duration_minutes`; `PENDING`, `CONFIRMED`, and `IN_PROGRESS` bookings consume shared capacity based on active mechanic count. Candidate duration must fit inside a configured opening window. Creation rechecks under a lock on the service-center row before inserting, so concurrent creates serialize.
- Phase 4C.10 unit coverage verifies allowed availability roles, malformed date/service rejection, timezone conversion, opening-window limits, duration overlap, capacity, explicit-offset input, and safe stale-slot feedback. SQL schema and booking operations were separately exercised by the recorded dedicated PostgreSQL integration suite (5/5); production/external migration state remains unknown.
- Customers and fleet managers can edit notes and reschedule only their own `PENDING` booking. The server derives identity from the verified session and accepts no client-supplied status, owner, vehicle, service, or mechanic fields. Availability is checked again in a service-center-locked transaction; an expected prior appointment timestamp prevents a stale form from overwriting a newer edit. Cancellation behavior is unchanged.
- Phase 4C.11 unit tests cover CUSTOMER/FLEET_MANAGER success, unauthenticated/provider/admin denial, ownership, pending-only state, invalid IDs/dates/notes, unavailable slots, missing records, safe database errors, and stale concurrent edits using a mocked repository. Booking persistence was separately exercised by the recorded PostgreSQL integration suite; this does not establish production/external database state.
- `CANCELLED` and `REJECTED` are distinct booking statuses in `database/schema.sql` and `prisma/schema.prisma`. The forward migrations `database/migrations/20261009_add_cancelled_booking_status.sql` and `database/migrations/20261011_add_rejected_booking_status.sql` use `ADD VALUE IF NOT EXISTS`. The dedicated Phase 5 test database passed the latest schema preflight and integration suite; migration state on production or external databases is UNKNOWN. This verification did not apply migrations.
- Mechanic shift calendars are not modeled; scheduling capacity counts active mechanics as parallel resources. Appointment start options use a documented 15-minute increment.
- `database/migrations/20261012_add_booking_scheduling.sql` adds the nullable timezone, normalized hours table, default-hours backfill for exact legacy defaults, and booking capacity index using idempotent DDL. The dedicated Phase 5 test database passed the latest schema preflight and booking integration suite. Its production/external application state remains UNKNOWN; this verification did not apply it. Existing centers with custom operating-hours text must configure structured hours and an IANA timezone at `/dashboard/admin/service-center/schedule` after migration. No timezone or hours were invented.
- A future session must NOT automatically begin another feature.
- Wait for explicit instructions from the user before implementing the next task.

Previous feature checkpoint: **`8a5facc`** — `feat: add appointment availability and scheduling`. The booking implementation subsequently completed internal checkpoints 4C.1–4C.12. The dedicated Phase 5 test database has now passed the integration suite; see the latest verification entry. Production/external databases remain outside that verification.

Verification history:
- Focused booking tests: 18 passed with Node's built-in test runner, covering creation, listing, ownership, not found, and safe database errors.
- TypeScript: `npx tsc --noEmit` passed.
- Lint: `npm run lint` passed with no warnings or errors.
- Production build: `npm run build` passed and generated all 13 static pages. The prior Edge Runtime warning disappeared after replacing Node `crypto` with `jose` in the middleware JWT module. The build required elevated filesystem access to write generated `.next` output.
- Stage 1 maintenance verification: 5 JWT tests passed for valid and legacy-format HS256 tokens, modified signatures, expiration, and malformed tokens. The combined maintenance booking/JWT tests passed 23/23.
- Phase 4C.4 verification: `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 35/35 tests, including all cancellation eligibility, ownership, input, error, and simulated concurrency cases. These are unit tests with an in-memory fake repository, not PostgreSQL integration tests.
- Phase 4C.4 TypeScript: `npx tsc --noEmit` passed. Lint: `npm run lint` passed. Production build: `npm run build` passed.
- Phase 4C.5 verification: `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0, `/dashboard/provider/bookings` emitted as a dynamic route); `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 44/44. Queue tests use mocked repositories; PostgreSQL connectivity remains unverified because `DATABASE_URL` and `.env` are absent.
- Phase 4C.6 verification (2026-10-11): `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0, provider bookings route emitted as dynamic); `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 54/54. Build needed elevated filesystem access to create the Prisma junction under `.next`. Tests use mocked repositories; PostgreSQL connectivity remains unverified because `DATABASE_URL` and `.env` are absent. The development-only GHSA-vfj7-8cjw-p6xm advisory described in Section 16 remains outstanding.
- Phase 4C.7 verification (2026-10-11): `npx prisma generate` passed; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0; `/dashboard/provider/bookings` emitted as dynamic). The unprivileged build attempt hit the Windows Prisma-junction permission error; the elevated retry passed. `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 64/64, including rejection and existing confirmation/cancellation regression tests. Unit tests use mocked repositories; PostgreSQL connectivity remains unverified because `DATABASE_URL` is unset and `.env` is absent. The development-only GHSA-vfj7-8cjw-p6xm advisory described in Section 16 remains outstanding.
- Phase 4C.8 verification (2026-10-11): `npx prisma generate` passed; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0; `/dashboard/provider/bookings/confirmed` emitted as dynamic). The unprivileged build attempt hit the Windows Prisma-junction permission error; the elevated retry passed. `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 84/84, including start-service authorization/state/concurrency/error cases and the existing creation, listing, cancellation, confirmation, rejection, and JWT regressions. Tests use mocked repositories; PostgreSQL connectivity remains unverified because `DATABASE_URL` is unset and `.env` is absent. The development-only GHSA-vfj7-8cjw-p6xm advisory described in Section 16 remains outstanding.
- Phase 4C.8 files changed: `lib/booking/booking-service.ts`, `lib/booking/booking-service.test.cjs`, `lib/db.ts`, provider booking `actions.ts` and pending queue page, plus `confirmed/page.tsx`, `confirmed/loading.tsx`, `confirmed/StartServiceForm.tsx`, and this status document. No schema migration was needed because `IN_PROGRESS` already exists in both SQL and Prisma enums.
- Phase 4C.9 verification (2026-10-12): `npx prisma generate` passed; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0; `/dashboard/provider/bookings/confirmed` emitted as dynamic). The initial unprivileged build failed because Windows denied creation of the Prisma junction under `.next`; the elevated retry passed. `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 99/99, including mechanic assignment and earlier booking/JWT regressions. Current process `DATABASE_URL` is unset; PostgreSQL connectivity was not tested. The development-only GHSA-vfj7-8cjw-p6xm advisory described in Section 16 remains outstanding.
- Phase 4C.9 files changed: `app/dashboard/provider/bookings/actions.ts`, `app/dashboard/provider/bookings/confirmed/page.tsx`, new `app/dashboard/provider/bookings/confirmed/AssignMechanicForm.tsx`, `lib/booking/booking-service.ts`, `lib/booking/booking-service.test.cjs`, `lib/db.ts`, and this status document. No schema or migration change was needed.
- Phase 4C.10 verification (2026-10-12): `npx prisma generate` passed; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0; `/dashboard/admin/service-center/schedule` and customer booking routes emitted as dynamic); `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 108/108. Unit tests use mocks for persistence; PostgreSQL connectivity and migration execution were not verified because `DATABASE_URL` is unset and `.env` files are absent. The development-only GHSA-vfj7-8cjw-p6xm advisory remains outstanding.
- Phase 4C.10 files changed: `database/schema.sql`, `database/migrations/20261012_add_booking_scheduling.sql`, `prisma/schema.prisma`, `lib/booking/scheduling.ts`, `lib/booking/booking-service.ts`, `lib/booking/booking-service.test.cjs`, `lib/db.ts`, customer booking creation page/form/actions, admin service-center schedule page/form/actions, and this status document. Migration application status is now recorded as unverified because no target database can be inspected.
- Phase 4C.11 verification (2026-10-12): `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0; customer booking detail and creation routes emitted as dynamic); `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 116/116. The Phase 4C.10 migration application state is unverified because PostgreSQL connectivity is unavailable. Tests use mocked repositories. The development-only GHSA-vfj7-8cjw-p6xm advisory remains outstanding.
- Phase 4C.11 files changed: `lib/booking/booking-service.ts`, `lib/booking/booking-service.test.cjs`, `lib/db.ts`, `app/dashboard/customer/bookings/actions.ts`, `app/dashboard/customer/bookings/[id]/page.tsx`, new `app/dashboard/customer/bookings/[id]/RescheduleBookingForm.tsx`, and this status document.
- Phase 4C.12 verification (2026-10-12): `npx prisma generate` passed; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0; `/dashboard/provider/bookings/in-progress` emitted as dynamic); `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 130/130. The sandboxed build first failed because Windows denied creation of Next.js's Prisma junction under `.next`; the permitted retry passed. PostgreSQL connectivity and the Phase 4C.10 migration were not verified because `DATABASE_URL` and `.env` are absent. The development-only GHSA-vfj7-8cjw-p6xm advisory remains outstanding.
- Phase 4C.12 files changed: `app/dashboard/provider/bookings/actions.ts`, `app/dashboard/provider/bookings/confirmed/page.tsx`, new `app/dashboard/provider/bookings/in-progress/page.tsx`, new `app/dashboard/provider/bookings/in-progress/CompleteServiceForm.tsx`, `lib/booking/booking-service.ts`, `lib/booking/booking-service.test.cjs`, `lib/db.ts`, and this status document. No schema change was needed because `COMPLETED` already exists in SQL and Prisma.
- Previous checkpoint audit: findings were reduced from 19 to 1 critical Next.js package entry; this historical result was superseded by the Next.js 16 migration documented in Section 16.
- PostgreSQL: connection was not attempted because the current process environment has no `DATABASE_URL`, `.env`, or `prisma/.env`; no credentials were created or printed.
- Phase 4 management verification (2026-10-12): `npx prisma generate` passed; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed (Next.js 16.4.0; `/dashboard/admin/service-center`, `/dashboard/admin/service-center/schedule`, and `/dashboard/admin/mechanics` emitted as dynamic routes); `node --test lib/admin/management.test.cjs` passed 13/13; `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 130/130. The first sandboxed build failed only because Windows denied creation of Next.js's Prisma junction under `.next`; the permitted retry passed. Live PostgreSQL is UNVERIFIED (`DATABASE_URL`, `.env`, and `prisma/.env` are absent). No schema changes or migrations were required. The development-only GHSA-vfj7-8cjw-p6xm remains outstanding.
- Phase 5 closure verification (2026-10-12): `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, and the elevated retry of `npm run build` passed. `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 130/130; `node --test lib/admin/management.test.cjs` passed 13/13. Tests are mocked/unit tests, not PostgreSQL integration or end-to-end lifecycle tests. The first concurrent TypeScript run overlapped with Next.js replacing `.next/types` and failed on missing generated types; the post-build sequential rerun passed. The sandbox build failed creating the Prisma junction due Windows access denial; elevated retry passed. `npm audit --json` could not reach registry.npmjs.org because DNS resolution failed; installed dependency inspection confirms `braces@3.0.3` remains under the dev-only `eslint-config-next` path, and GHSA-vfj7-8cjw-p6xm currently has no published patched version. `DATABASE_URL`, `.env`, and `prisma/.env` are absent and localhost:5432 is closed. The application state of each booking migration is UNKNOWN; this audit applied none. Official PLAN Phase 5 is therefore **IMPLEMENTED — VERIFICATION PENDING**, not fully verified. Audit baseline Git checkpoint: `c7337bf144aa99a92ec96bc0ab8b0fc61e2bbb87`.
- Phase 5 PostgreSQL verification attempt (2026-10-12): `DATABASE_URL`, `.env`, and `prisma/.env` are absent; localhost:5432 is closed. The Docker CLI/Compose client is installed, but the Docker Desktop engine pipe is unavailable and no Docker Desktop executable was found at the standard locations checked. No PostgreSQL instance was started or contacted, no migrations were applied, and no real-database lifecycle test was run. Added `compose.postgres-test.yaml`, `.env.postgres-test.example`, and `docs/phase-5-postgres-test-setup.md` with an isolated loopback-only, no-volume test database configuration, a verified historical schema baseline (`76e0b2e`), migration order, and safe setup/query instructions. `docker compose config --quiet` passed using a validation-only placeholder; the actual migration state for each of the three files remains UNKNOWN. Phase 5 stays **IMPLEMENTED — VERIFICATION PENDING**. Git baseline inspected: `1ccd7b4b38b05e51e5f5630f25adee6543717194`; no commit was made because live verification is blocked.
- Phase 5 safe regression checks (2026-10-12): `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed; build required elevated access for the Windows Prisma junction. Booking/JWT unit tests passed 130/130 and admin-management unit tests passed 13/13. These use mocks and do not verify PostgreSQL. `npm audit --json` could not reach the registry due DNS failure; the installed tree contains `braces@3.0.3` under development-only `eslint-config-next`, and the GitHub advisory reports no patched release. No application code, migrations, credentials, or test database were changed or created.
- Phase 5 integration preflight correction (2026-10-12): the index-existence raw query now casts `to_regclass(...)` to `text`, avoiding Prisma's unsupported `regclass` deserialization. `tsx@^4.23.15` is declared as a dev dependency and locked; the integration script invokes `tsx --test`. `node --test lib/booking/phase5-postgres-test-target.test.cjs lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs lib/admin/management.test.cjs` passed 146/146 (guard and mocked tests). `npm run test:integration:phase5` launched through tsx but exited at the explicit target guard because this shell lacks `PHASE5_TEST_DATABASE_URL`; no connection/schema preflight/booking operations occurred. No database changes or cleanup were needed. The failure described by the user is addressed in code, but passing database execution remains unverified.
- Latest Phase 5 verification (2026-10-12; results verified against the dedicated PostgreSQL test DB): PostgreSQL integration suite passed 5/5, including schema preflight and booking persistence/lifecycle checks; mocked/unit and safety-guard suite passed 146/146. `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed; build used Next.js 16.4.0. `npm audit --omit=dev` reported 0 vulnerabilities; full `npm audit` reports 5 high-severity development-dependency findings involving `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, and `braces` (known advisory GHSA-vfj7-8cjw-p6xm remains outstanding). This verifies only the dedicated test database, not production/external DB migration state. The overall `PLAN.md` success criteria are not all met: invoicing, reviews, notifications, admin dashboard, and later work remain open. No claim is made that the full project is complete.
- Phase 5 finalization audit (2026-10-12): reran `node --test lib/booking/phase5-postgres-test-target.test.cjs lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs lib/admin/management.test.cjs` (146/146 passed), `npm run lint` (passed), `npx tsc --noEmit` (passed), `npm run build` (passed on elevated retry; Next.js 16.4.0), and `npm audit --omit=dev` (0 vulnerabilities). `npm audit` returned 5 high-severity findings in the dev chain `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` (GHSA-vfj7-8cjw-p6xm). This execution shell could not rerun the PostgreSQL suite: `PHASE5_TEST_DATABASE_URL` was unset and `127.0.0.1:55432` was unreachable, so the guarded script exited before connection or writes. The latest recorded dedicated-test-DB integration result remains 5/5 passed; that test DB result does not verify production/external migrations. No Phase 5 implementation gap was found. The plan explicitly assigns invoice generation to Phase 7 but does not name the status transition separately; this checklist assigns `COMPLETED → INVOICED` to Phase 7 with invoice generation. Neither is implemented here. Phase 5 booking scope is complete through `COMPLETED`; Phase 7 and the other later project criteria remain open.
- Phase 4 management files changed: `app/dashboard/admin/service-center/page.tsx`, new `service-center/actions.ts`, `ServiceCenterForm.tsx`, `loading.tsx`, `app/dashboard/admin/mechanics/page.tsx`, new `mechanics/actions.ts`, `MechanicManagementForms.tsx`, `loading.tsx`, `lib/admin/management.ts`, `lib/admin/session.ts`, `lib/admin/management.test.cjs`, `lib/db.ts`, `PROJECT_STATUS.md`, and `README.md`. Feature checkpoint: `0681e52` (`feat: complete service center and mechanic management`); verify the final pushed `main` head in Git history.
- Phase 4 audit verification rerun (2026-10-12): the Prisma, TypeScript, lint, production build, admin-management, and booking/JWT checks all passed; test counts were 13/13 admin and 130/130 booking/JWT. Live PostgreSQL remains unverified because `DATABASE_URL`, `.env`, and `prisma/.env` are absent. No feature, schema, or migration changes were needed. `origin/main`'s local tracking ref matched `4daaea65f02dd42c60bee6cc4fab508d40389538`; a fresh remote lookup was unavailable because DNS/network access failed. The outstanding development-only advisory GHSA-vfj7-8cjw-p6xm remains documented above.

---

## 13. FUTURE PHASE ORDER

Based on `PLAN.md` planned phase order:

```text
Phase 4C.1 — Booking Creation — COMPLETE (dedicated PostgreSQL integration verified; production/external DB unverified)
  • Customer booking form, server-side validation, ownership and service-type checks
  • New booking requests are stored through Prisma with PENDING status
Phase 4C.2 — Booking Listing — COMPLETE (dedicated PostgreSQL integration verified; production/external DB unverified)
  • Customer-scoped server-rendered booking list with loading, empty, and error states
Phase 4C.3 — Customer Booking Details — COMPLETE (dedicated PostgreSQL integration verified; production/external DB unverified)
  • Customer-scoped server-rendered details page; booking ID and authenticated customer ID are queried together
Phase 4C.4 — Customer Booking Cancellation — COMPLETE (dedicated PostgreSQL integration verified; production/external migration state unverified)
  • Customer/fleet manager may cancel only their own PENDING booking; atomic conditional update writes CANCELLED
  • Forward migration: database/migrations/20261009_add_cancelled_booking_status.sql (present in the dedicated DB schema preflight; production/external application state unverified)
Phase 4C.5 — Service Provider Pending Booking Queue — COMPLETE (dedicated PostgreSQL integration verified; production/external DB unverified)
  • Read-only server-rendered pending queue; only SERVICE_PROVIDER and ADMIN are authorized
  • Prisma filters PENDING in the database and selects minimal booking/customer/vehicle/service fields
Phase 4C.6 — Provider Booking Confirmation — COMPLETE (dedicated PostgreSQL integration verified; production/external DB unverified)
  • SERVICE_PROVIDER and ADMIN can confirm a PENDING booking via a server-authorized action
  • Atomic Prisma update transitions only a still-PENDING booking to CONFIRMED; stale/concurrent requests cannot transition it twice
Phase 4C.7 — Provider Booking Rejection — COMPLETE (dedicated PostgreSQL integration verified; production/external migration state unverified)
  • SERVICE_PROVIDER and ADMIN can reject a PENDING booking via a server-authorized action
  • Atomic Prisma update sets REJECTED only when the booking remains PENDING; customer cancellation still writes CANCELLED
  • Forward enum migration: database/migrations/20261011_add_rejected_booking_status.sql (present in the dedicated DB schema preflight; production/external application state unverified)
Phase 4C.8 — Provider Starts a Confirmed Booking — COMPLETE (dedicated PostgreSQL integration verified; production/external DB unverified)
  • SERVICE_PROVIDER and ADMIN can list CONFIRMED bookings and start service via a server-authorized action
  • Atomic Prisma update transitions only a still-CONFIRMED booking to IN_PROGRESS
Phase 4C.9 — Mechanic Assignment to Confirmed Bookings — COMPLETE (dedicated PostgreSQL integration verified; production/external DB unverified)
  • SERVICE_PROVIDER and ADMIN assign an active same-center mechanic to an unassigned CONFIRMED booking
  • Conditional parameterized PostgreSQL update rechecks status, assignment, mechanic activity, and service-center match atomically
Phase 4C.10 — Appointment Availability and Scheduling — COMPLETE (dedicated PostgreSQL integration verified; production migration state not verified)
  • Structured service-center weekly hours and explicit IANA timezone; exact default text schedule is backfilled
  • Duration-aware appointment capacity based on active mechanics, with 15-minute selectable starts
  • Booking creation serializes and rechecks availability before insert
Phase 4C.11 — Customer Booking Editing and Rescheduling — COMPLETE (dedicated PostgreSQL integration verified; production migration state not verified)
  • Owner-only edits to notes and appointment time while status remains PENDING
  • Availability rechecked transactionally; stale appointment timestamps prevent overwrites
Phase 4C.12 — Provider Booking Completion — COMPLETE

Official PLAN Phase 6 — Service Records & Parts — VERIFIED for implemented service-record/parts-consumption scope (dedicated PostgreSQL test DB)
  • Service execution recording is captured during provider completion; customer-owned and provider/admin history reads are available
  • Consumed parts are inserted into service_parts and deducted by the existing SQL trigger in the same transaction
  • Existing stock quantity and reorder threshold are retained; this Phase 6 work does not add an inventory restock/parts-catalog management interface

Official PLAN Phase 7 — Invoicing — IMPLEMENTED AND VERIFIED within tested scope (6 dedicated PostgreSQL integration tests passed)
  • Providers/admins issue one invoice for a completed service; customers can view invoices for their own bookings
  • Subtotal/tax/total use the SQL `calculate_invoice_totals(p_service_id INTEGER)` function and recorded part prices
  • The invoice is displayed in the authenticated customer/provider/admin invoice detail route; PDF generation is not specified by the Phase 7 section

Official PLAN Phase 8 — Reviews & Ratings — IMPLEMENTED AND VERIFIED within tested scope (11 unit, 150 regression, and 4 dedicated PostgreSQL integration tests passed)
  • Submit review for owned completed services, with server-derived customer ID
  • Rating (1-5) and optional comment; one review per booking
  • Display the saved review in the owner-scoped booking detail page

Official PLAN Phase 9 — Email Notification System — IMPLEMENTED AND VERIFIED within tested scope
  • Customer emails on booking request/status events and invoice issuance
  • Server-side Nodemailer SMTP configuration; credentials are environment-only
  • Guarded PostgreSQL context suite passed 3/3 against the dedicated test database; live SMTP is untested; no outbox/retry guarantee

Official PLAN Phase 10 — Admin Dashboard — IMPLEMENTED AND VERIFIED WITHIN THE TESTED SCOPE
  • Configured-center operational oversight dashboard
  • Booking status, mechanics, low-stock parts, invoices, reviews, and five recently scheduled bookings
  • 3 unit, 184 regression, and 1 guarded dedicated-PostgreSQL integration test passed; TypeScript, lint, and Next.js 16.4.0 production build passed

Official PLAN Phase 11 — Testing & Quality Assurance — COMPLETE within the defined tested QA scope (19 focused, 206 combined, 23 dedicated PostgreSQL integration, and 7 local browser E2E tests pass; TypeScript, lint, build pass; fresh audit: 0 production and 5 high development findings; see Section 3G)
  • Unit tests (Jest)
  • Integration tests
  • E2E tests (Playwright)
  • Security audits

Official PLAN Phase 12 — Polish & Deployment — NOT STARTED
  • Responsive UI improvements
  • Vercel deployment configuration
  • Production hardening

The original plan has 39 tasks across 12 phases; remaining work is not re-estimated here.
```

> **Note**: Custom Phase 4C tracking decomposes official `PLAN.md` Phase 5 — Booking System into tasks 4C.1–4C.12. The booking scope is verified by 5 PostgreSQL integration tests plus 146 mocked/unit and safety-guard tests. Phase 6’s service-record/parts-consumption scope is separately verified by 4 PostgreSQL tests in the user’s Windows PowerShell environment. Phase 7 invoicing is verified within its tested scope by 6 PostgreSQL integration tests against the dedicated test database; this does not verify production or external database migrations. Phase 8 review submission/display is implemented and verified within its tested scope by 11 unit tests, 150 regression tests, and 4 dedicated PostgreSQL integration tests; TypeScript, lint, and production build passed. Phase 9 email notification behavior is implemented and verified within its tested scope: 10 unit tests, 161 regression tests, and 3 guarded PostgreSQL integration tests passed, along with TypeScript, lint, and production build. The database suite used only the dedicated test database. Live SMTP and production/external databases remain untested; delivery is best-effort without an outbox or automatic retry. Phase 10 admin dashboard is implemented and verified within its tested scope: 3 unit tests, 184 regression tests, 1 guarded dedicated-PostgreSQL integration test, TypeScript, lint, production build, and `git diff --check` passed. The Phase 10 integration test used only the dedicated test database; production/external databases remain untested. Live SMTP is an untested Phase 9 limitation. Phase 11 is COMPLETE within the defined tested QA scope (see Section 3G); Phase 12 remains NOT STARTED.

---

## 14. DEVELOPMENT RULES FOR FUTURE SESSIONS

```text
## DEVELOPMENT RULES
```

### Rule 1 — Small Tasks
Implement one small feature/task at a time. Do not combine multiple major modules into one task.

### Rule 2 — Inspect First
Before coding, inspect the existing implementation. Do not assume previous work is exactly as described in this document.

### Rule 3 — Preserve Architecture
Maintain the existing:
- SQL-first database architecture
- PostgreSQL as source of truth
- Prisma typed access and client generation; SQL files remain schema/migration source of truth
- Next.js App Router architecture
- Authentication system (JWT + cookies + RBAC)
- RBAC role definitions

Do not introduce unnecessary technologies.

### Rule 4 — No Scope Creep
Only implement the explicitly requested phase/task. Do not implement future features automatically.

### Rule 5 — Security
Never commit:
- `.env`
- credentials
- API keys
- passwords
- secrets

Always check Git status before committing. Use `git status` and `git diff` before committing.

### Rule 6 — Test
Run appropriate tests and:
```bash
npm run lint
npm run build
```
when available. Report actual results; do not claim a command passed unless it was actually executed.

### Rule 7 — Git
Use small, descriptive commits. Never force push. Never rewrite history.

### Rule 8 — STOP
Every phase/task must have an explicit stop condition. After completing the requested task, stop and wait for the next instruction.

---

## 15. IMPORTANT ARCHITECTURAL NOTES

### SQL-First Approach
All schemas, functions, triggers, views, and indexes are defined in `database/*.sql`. Prisma is used only for type generation (`prisma db pull`). The PostgreSQL database is the source of truth.

### Concurrency Control
Explicit PostgreSQL transactions with row-level locking (`SELECT ... FOR UPDATE`) for high-contention operations (mechanic assignment, inventory deduction). Prevents race conditions at the database level.

### Workflow State Machine
Booking workflow: `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → INVOICED`, with `PENDING → CANCELLED` as a separate terminal customer outcome and `PENDING → REJECTED` as a separate terminal provider outcome. Confirmation, customer cancellation, provider rejection, service start/completion, mechanic assignment, pending-only owner edit/rescheduling, Phase 6 service record creation, and Phase 7 invoice issuance enforce state and role/ownership rules through conditional or transactional database writes. Phase 7 invoice behavior is verified by 6 integration tests against the dedicated PostgreSQL test database; production/external database verification is not included.

### Authentication
JWT signing/verification uses `jose`, password hashing uses Node.js crypto PBKDF2-SHA512, and session handling uses an HTTP-only cookie. The `db.user` adapter remains a placeholder, so persisted login/registration is incomplete. Never trust client-supplied roles; Proxy routing does not replace Server Action/service authorization.

### Single Service Center
The project operates as a single service center model. No multi-location support. All mechanics, bookings, and parts belong to one service center.

---

## 16. KNOWN LIMITATIONS / TECHNICAL DEBT

### Mock/In-Memory DB Behavior
Legacy user and vehicle methods in `lib/db.ts` remain placeholders. Implemented booking, service-record, invoice, review, email-context, and admin-dashboard workflows use Prisma/PostgreSQL and have the dedicated test-database evidence listed above. Phase 4A/4B service-center/mechanic CRUD has mocked management coverage, but a dedicated PostgreSQL CRUD integration result is not recorded. Production/external database connectivity and migrations remain unverified.

### Incomplete Test Coverage
The repository uses Node's built-in test runner through `tsx` for focused `.test.cjs` suites. Playwright 1.64.1 and Chromium are configured for a limited Phase 11 browser suite; Jest and React Testing Library remain unconfigured. The focused suite passed 19/19, combined unit/mock/regression run passed 206/206, the user-reported dedicated PostgreSQL regression run passed 23/23 across six Phase 5–10 suites, and the local Playwright route/auth suite passed 7/7. Persisted authentication, vehicle CRUD, data isolation, and database-backed browser journeys remain unverified. Phase 11 is COMPLETE within its defined tested QA scope; see Section 3G for limits.

### Verification Setup
ESLint uses the Next.js Core Web Vitals rules through ESLint 9 flat config. Latest recorded Phase 10 verification passed TypeScript, lint, build (Next.js 16.4.0), and the phase's guarded PostgreSQL test; the build was completed in regular PowerShell. Older build permission failures are historical and were superseded by successful retries. Phase-specific test counts and their environments are recorded in Sections 3A–3F.

### Next.js 16 Security Migration (2026-10)
- Migrated Next.js 14.2.35 to stable Next.js 16.4.0, React/React DOM 19.3.0, ESLint 9.39.5, and `eslint-config-next` 16.4.0 using regular npm peer resolution.
- Converted `cookies()` and dynamic route `params` to asynchronous APIs, migrated the booking form to React 19 `useActionState`, and renamed `middleware.ts` to `proxy.ts` while preserving the matcher, JWT verification, login redirect, and role checks.
- Corrected the legacy `use action` directive in auth server actions to supported `use server`; Next 16 rejected the old directive during production compilation.
- ESLint now uses flat config and `eslint .`; Next updated `tsconfig.json` to its automatic JSX runtime and development type include.
- ESLint 10 was evaluated. Next's currently published stable plugin dependencies (`eslint-plugin-import`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-react`) declare ESLint peer ranges ending at 9. The published Next canary config also retains those dependencies. ESLint 10 therefore produces invalid peer dependencies under `npm ls`; the validated ESLint 9.39.5 config is retained. npm marks 9.39.5 unsupported, leaving a follow-up for a peer-clean stable Next plugin release.

### Development Dependency Security Follow-up (current audit 2026-10-20; prior analysis retained)
- `npm audit --omit=dev`: 0 vulnerabilities in production dependencies. This is a production-only result and does not clear findings in the full dependency tree.
- Full `npm audit`: 5 high-severity findings remain in the development dependency chain involving `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, and `braces`. The known outstanding advisory is GHSA-vfj7-8cjw-p6xm, associated with the `braces` stack-exhaustion DoS. Do not describe the entire dependency tree as vulnerability-free.
- Dependency path: direct dev dependency `eslint-config-next@16.4.0` → transitive dev `@next/eslint-plugin-next@16.4.0` → `fast-glob@3.3.1` → `micromatch@4.0.8` → vulnerable `braces@3.0.3`. npm marks the owning packages as high through this same advisory; it is not five distinct advisories. No production dependency is affected.
- Remediation assessment: `fast-glob@3.3.3` still depends on `micromatch@^4.0.8`; the current Next stable and canary ESLint configs both retain `fast-glob@3.3.1`. The underlying `braces` package has no fixed upstream version, so no compatible fixed version exists for an override. npm's suggested downgrade to `eslint-config-next@14.2.35` is rejected because it regresses the security migration and does not fix this advisory.
- Runtime exposure in this repository's configured lint workflow is limited: the Next rule that calls `fast-glob`'s `globSync` is `@next/next/no-html-link-for-pages`; its root-directory glob processing only runs when `settings.next.rootDir` is configured. This repo's flat config does not set that setting, so normal lint uses the current working directory directly and does not pass user-controlled patterns through `braces`. Keep `settings.next.rootDir` unset until a patched upstream release is available. The dependency remains present and audit must continue to report it.
- ESLint compatibility recheck: current stable `eslint-config-next@16.4.0` is peer-compatible with ESLint >=9, but its bundled React/import/accessibility plugin packages declare peer ranges through ESLint 9. Installing ESLint 10 made `npm ls` invalid. The current Next canary includes work for ESLint 10 but still declares the same peer-limited plugin dependencies; no peer-clean stable update is available. Retain ESLint 9.39.5 and existing Core Web Vitals, React, React Hooks, and accessibility rules. TypeScript-specific ESLint rules were not configured previously and remain out of scope.
- Historical `npm audit --omit=dev` result on 2026-10-10: 0 vulnerabilities. Latest production-only and full-audit results are recorded above.
- Fresh `npm audit --omit=dev` on 2026-10-20: 0 vulnerabilities (exit 0). Fresh full `npm audit`: 5 high-severity development dependency findings (exit 1), 0 production findings. `npm audit fix --dry-run` offered only the breaking `eslint-config-next@14.2.35` downgrade; no fix was applied. The Playwright tooling install did not remediate the advisory.
- Final checks on 2026-10-10: `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed; 35/35 tests passed. `npm ls` completed without invalid peer dependencies. No database credentials or database migration were used.
- This audit's historical database note predates the latest Phase 5 verification. The dedicated PostgreSQL test database has since been verified; production and external database connectivity/migration state remain unverified.

Production PostgreSQL runtime connectivity remains unverified. Before validating Prisma or applying a migration to any non-test database, provide its approved `DATABASE_URL` through the ignored local `.env` file or process environment and verify the intended target.

### Partially Implemented CRUD
- Service-center/mechanic CRUD is implemented through Prisma and covered by 13 mocked management tests; a dedicated PostgreSQL CRUD integration result is not recorded, so database behavior for these screens is not claimed as live-verified.
- User registration/login persistence is incomplete because `db.user` remains a placeholder.
- Vehicle list/add/detail/edit routes exist as scaffolding, but `db.vehicle` is a placeholder and the add UI uses a fixed owner ID; persisted owner-scoped CRUD is not implemented.

### Database Trigger Coverage
- Existing `updated_at` triggers handle timestamps.
- Phase 6 service completion inserts `service_parts`, which invokes `trg_deduct_inventory` and `deduct_part_inventory()` from `database/triggers.sql`.
- The Phase 6 PostgreSQL suite preflights the inventory function and trigger before creating fixtures.

### Authentication — Development vs Production
- A development fallback `JWT_SECRET` is present in the example/runtime fallback; deployment must supply a strong environment secret. The fallback must not be used in production.
- No password reset flow is implemented.
- Session resolution depends on `db.user.findUnique`, which currently returns `null`; end-to-end persisted login is incomplete.

### UI Styling Inconsistency
- Some pages use inline styles, some use CSS classes
- No consistent Tailwind configuration or design system
- Page layouts vary in structure

### No TypeScript Generation from SQL
- `prisma generate` has passed in recorded checks, but this does not prove `prisma/schema.prisma` matches every SQL object or any deployed database. SQL/Prisma parity and external database migration state remain unverified.

### Email Delivery Boundary
- Phase 9 Nodemailer workflow and guarded recipient-context integration are implemented and tested (10 unit, 161 regression, 3 PostgreSQL context tests recorded).
- Live SMTP delivery is untested. Sending is best-effort after the database commit; there is no durable outbox or automatic retry. The SQL `notifications` table is not an email outbox.

---

## 17. INSTRUCTIONS FOR THE NEXT SESSION

```text
## INSTRUCTIONS FOR THE NEXT SESSION
```

1. Read `PROJECT_STATUS.md`.
2. Read `PLAN.md` to understand the full phase roadmap.
3. Verify the current Git commit with `git log --oneline -1`; do not assume a fixed checkpoint.
4. Inspect the actual repository before coding — do not assume this document is up-to-date with the latest code.
5. Confirm the requested task with the user before implementing.
6. Implement ONLY that task — do not automatically begin the next phase.
7. Run focused tests and verification:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   node --test lib/booking/booking-service.test.cjs
   ```
8. Review `git status` and `git diff`; preserve unrelated user work.
9. Update status documentation with only verified outcomes and the actual repository checkpoint.
10. Do not commit, push, or start another phase unless explicitly requested. **STOP and wait for further instructions.**

>The next session must NOT assume it should automatically continue development. Each task must be explicitly requested.

---

## 18. FINAL VALIDATION

After creating this file:

1. ✅ Read the entire file for contradictions.
2. Compare phase status against the actual repository and distinguish implementation, mock tests, PostgreSQL test-database results, production/external DB verification, and live-service testing.
3. Verify the latest Git commit and preserve any uncommitted work.
4. ✅ Verify no secrets are included (`.env`, credentials, API keys not committed).
5. Check that partial authentication/vehicle features and unverified environments are not marked complete.
6. ✅ Ensure the document is concise enough to be useful as a handoff document.
7. ✅ Follow the explicit scope of the user's current task.
8. ✅ Do NOT implement future features without user instructions.

---

## 19. GIT

When reviewing Git state:

```bash
git status
git diff
# Preserve unrelated pre-existing changes; inspect only the files authorized for the current documentation task.
```

Do not commit or push unless the user explicitly requests it.

---

## 20. FINAL RESPONSE

The latest implementation and Git checkpoint are reported in the completion message for the current task. Stop after the explicitly requested phase; do not begin another development task without user instructions.
