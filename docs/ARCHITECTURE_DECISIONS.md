# Architecture Decision Records (ADR) - Vehicle Service & Maintenance Platform

## 1. PostgreSQL & SQL-First Approach
- **Decision**: Use PostgreSQL as the core database and keep SQL schema, functions, triggers, views, indexes, and forward-only migration files under `database/` as database-definition sources. Prisma provides type-safe access in implemented workflows and client generation; it is not the schema migration source of truth.
- **Rationale**: University DBMS project requirements mandate demonstrating advanced relational database design (normalization, foreign keys, constraints, triggers, functions, views, indexing, CTEs, window functions). SQL-first ensures complete control over database capabilities.

## 2. Next.js 16 App Router & TypeScript
- **Decision**: Use Next.js 16 App Router with React 19 and TypeScript throughout. Dynamic route params and request APIs such as `cookies()` are asynchronous; protected dashboard routing uses the Node.js `proxy.ts` entry point.
- **Rationale**: Provides React Server Components, server actions, clean API routing, and robust type safety across frontend and backend while keeping the framework on a patched stable release.

## 3. Authentication & Authorization (JWT + RBAC)
- **Decision**: Use JWT (`jose`), Node.js crypto PBKDF2-SHA512 password hashing, HTTP-only cookies, and role checks for the roles `CUSTOMER`, `SERVICE_PROVIDER`, `FLEET_MANAGER`, and `ADMIN`.
- **Rationale / current limitation**: Implemented feature Server Actions/services derive actors from signed sessions and enforce roles where applicable. The legacy `db.user` adapter is still a placeholder, so persisted registration/login is incomplete; do not infer complete authentication from the JWT tests or route Proxy.

## 4. Concurrency Control & Transactions
- **Decision**: Use explicit PostgreSQL transactions with row-level locking (`SELECT ... FOR UPDATE`) for high-contention operations such as mechanic assignment and inventory deduction.
- **Rationale**: Prevents race conditions (e.g., double-booking a mechanic or negative inventory stock) at the database level.

## 5. Workflow State Machine
- **Decision**: Preserve `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → INVOICED`, plus separate terminal outcomes `PENDING → CANCELLED` (customer) and `PENDING → REJECTED` (provider).
- **Rationale / verification boundary**: Implemented booking transitions use server-side role/ownership checks and conditional or transactional PostgreSQL operations. Phases 5–7 lifecycle behavior passed the recorded dedicated PostgreSQL suites (5, 4, and 6 tests respectively); no production/external DB state is claimed.

## 6. Email Notifications
- **Decision**: Use Nodemailer with SMTP for email workflow messages after booking status updates and invoice generation.
- **Rationale / limitation**: Phase 9 unit/regression and guarded PostgreSQL context tests passed, but live SMTP delivery has not been tested. Delivery is best-effort after database commit, with no transactional outbox or automatic retry.

## 7. Appointment Scheduling
- **Decision**: Use normalized weekly service-center opening windows and an explicit IANA timezone. Offer starts every 15 minutes, use each service type's estimated duration, and treat active mechanics as parallel capacity. `PENDING`, `CONFIRMED`, and `IN_PROGRESS` bookings reserve capacity.
- **Concurrency**: Availability-changing writes lock the service-center row, recheck overlap/capacity, and then persist in one PostgreSQL transaction. Mechanic assignment also rejects overlapping work for the same mechanic.
- **Rationale**: The legacy `operating_hours` text cannot safely represent weekly hours or a timezone. Existing centers are backfilled only when that text exactly matches its known default; custom values require explicit administrator configuration. The timezone remains unset until configured rather than assuming one.
- **Limit**: Mechanic shifts and multiple breaks per day are not represented in the current admin form. The SQL table can store multiple windows per day, but the first interface configures one continuous window per weekday.
