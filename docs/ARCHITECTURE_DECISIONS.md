# Architecture Decision Records (ADR) - Vehicle Service & Maintenance Platform

## 1. PostgreSQL & SQL-First Approach
- **Decision**: Use PostgreSQL as the core database and define all schemas, functions, triggers, views, and indexes in raw SQL (`database/*.sql`). Prisma is used strictly for type generation and type-safe database access (`prisma db pull`), not as the schema migration source of truth.
- **Rationale**: University DBMS project requirements mandate demonstrating advanced relational database design (normalization, foreign keys, constraints, triggers, functions, views, indexing, CTEs, window functions). SQL-first ensures complete control over database capabilities.

## 2. Next.js 14+ App Router & TypeScript
- **Decision**: Use Next.js App Router with TypeScript throughout.
- **Rationale**: Provides modern React Server Components, server actions, clean API routing, and robust type safety across frontend and backend.

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
