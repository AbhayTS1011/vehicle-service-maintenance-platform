# Architecture Decision Records (ADR) - Vehicle Service & Maintenance Platform

## 1. PostgreSQL & SQL-First Approach
- **Decision**: Use PostgreSQL as the core database and define all schemas, functions, triggers, views, and indexes in raw SQL (`database/*.sql`). Prisma is used strictly for type generation and type-safe database access (`prisma db pull`), not as the schema migration source of truth.
- **Rationale**: University DBMS project requirements mandate demonstrating advanced relational database design (normalization, foreign keys, constraints, triggers, functions, views, indexing, CTEs, window functions). SQL-first ensures complete control over database capabilities.

## 2. Next.js 16 App Router & TypeScript
- **Decision**: Use Next.js 16 App Router with React 19 and TypeScript throughout. Dynamic route params and request APIs such as `cookies()` are asynchronous; protected dashboard routing uses the Node.js `proxy.ts` entry point.
- **Rationale**: Provides React Server Components, server actions, clean API routing, and robust type safety across frontend and backend while keeping the framework on a patched stable release.

## 3. Authentication & Authorization (JWT + RBAC)
- **Decision**: Implement stateless authentication using JWT (signed via `jose`), password hashing with `bcrypt`, and secure HTTP-only cookies, combined with server-side Role-Based Access Control (RBAC: `CUSTOMER`, `SERVICE_PROVIDER`, `FLEET_MANAGER`, `ADMIN`).
- **Rationale**: Never trust client roles; enforce strict server-side authorization checks on all API routes and Server Actions.

## 4. Concurrency Control & Transactions
- **Decision**: Use explicit PostgreSQL transactions with row-level locking (`SELECT ... FOR UPDATE`) for high-contention operations such as mechanic assignment and inventory deduction.
- **Rationale**: Prevents race conditions (e.g., double-booking a mechanic or negative inventory stock) at the database level.

## 5. Workflow State Machine
- **Decision**: Preserve the service lifecycle `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → INVOICED` and allow a separate terminal customer cancellation transition `PENDING → CANCELLED`.
- **Rationale**: Customer cancellation is restricted to the authenticated owner and enforced by a single conditional update requiring the current status to be `PENDING`. No other lifecycle transitions are implemented by this feature.

## 6. Email Notifications
- **Decision**: Use Nodemailer with SMTP for asynchronous email notifications triggered upon booking status updates and invoice generation.
- **Rationale**: Keeps communication robust without external paid services.

## 7. Appointment Scheduling
- **Decision**: Use normalized weekly service-center opening windows and an explicit IANA timezone. Offer starts every 15 minutes, use each service type's estimated duration, and treat active mechanics as parallel capacity. `PENDING`, `CONFIRMED`, and `IN_PROGRESS` bookings reserve capacity.
- **Concurrency**: Availability-changing writes lock the service-center row, recheck overlap/capacity, and then persist in one PostgreSQL transaction. Mechanic assignment also rejects overlapping work for the same mechanic.
- **Rationale**: The legacy `operating_hours` text cannot safely represent weekly hours or a timezone. Existing centers are backfilled only when that text exactly matches its known default; custom values require explicit administrator configuration. The timezone remains unset until configured rather than assuming one.
- **Limit**: Mechanic shifts and multiple breaks per day are not represented in the current admin form. The SQL table can store multiple windows per day, but the first interface configures one continuous window per weekday.
