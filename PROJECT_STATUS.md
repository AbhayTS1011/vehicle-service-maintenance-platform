# PROJECT_STATUS.md - Vehicle Service & Maintenance Platform

## 1. PROJECT OVERVIEW

### Project
**Vehicle Service & Maintenance Platform**

A production-quality, database-driven vehicle service and maintenance management platform built with Next.js, TypeScript, PostgreSQL, and Prisma. This is a university DBMS project at PES University (Team 22, Section AIML A).

### Purpose
The platform manages the complete vehicle-service lifecycle for a single service center: customers, vehicles, service bookings, mechanic assignments, service records, parts inventory, invoices, reviews, and notifications. Uses SQL-first PostgreSQL database design with Prisma for type generation.

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
Latest completed feature checkpoint: Phase 4C.4 — Customer Booking Cancellation (see latest feature commit on `main`).
Previous feature checkpoint: 01f2009 (`feat: implement customer booking details`).
Latest maintenance checkpoint before the security migration: 5b5c633 (`chore: remediate dependency and runtime issues`).
Security migration base: e783437 (`feat: implement customer booking cancellation`).
Current migration checkpoint: `chore: migrate to patched Next.js 16`.
GitHub:
https://github.com/AbhayTS1011/vehicle-service-maintenance-platform
```

> **Important:** Before making changes, verify the current Git commit and working tree. Do not assume this document is newer than the repository.

---

## 3. PROJECT STATUS TABLE

| Phase | Status |
|---|---|
| Phase 1 — Foundation & Infrastructure | COMPLETE |
| Phase 2 — Authentication & RBAC | COMPLETE |
| Phase 3 — Vehicle Management | COMPLETE |
| Phase 4A — Service Center Management | COMPLETE |
| Phase 4B — Mechanic Management | COMPLETE |
| Phase 4C.1 — Booking Creation | COMPLETE (database connection not verified in this environment) |
| Phase 4C.2 — Booking Listing | COMPLETE (PostgreSQL connectivity not verified) |
| Phase 4C.3 — Customer Booking Details | COMPLETE (build verified; PostgreSQL connectivity not verified) |
| Phase 4C.4 — Customer Booking Cancellation | COMPLETE (migration added; live database not verified) |
| Remaining Phase 4C — Booking Management | NOT STARTED |
| Phase 5 — Service Records & Parts | NOT STARTED |
| Phase 6 — Invoicing | NOT STARTED |
| Phase 7 — Reviews & Ratings | NOT STARTED |
| Phase 8 — Email Notification System | NOT STARTED |
| Phase 9 — Admin Dashboard | NOT STARTED |
| Phase 10 — Testing & Quality Assurance | NOT STARTED |
| Phase 11 — Polish & Deployment | NOT STARTED |

---

## 4. COMPLETED IMPLEMENTATIONS

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

**Key SQL-first architecture decisions**:
- All schemas, functions, triggers, views, indexes defined in `database/*.sql`
- Prisma used strictly for type generation (`prisma db pull`)
- PostgreSQL is the source of truth for schema

---

### Phase 2 — Authentication & RBAC

**Authentication flow**:
```text
Registration
    ↓
Password hashing (bcrypt with salt)
    ↓
User record (id, name, email, password_hash, role, phone, created_at, updated_at)
    ↓
Login
    ↓
JWT session (signed via jose)
    ↓
HTTP-only cookie (apex_session)
    ↓
Server-side session verification (verifyToken)
    ↓
RBAC / ownership checks (middleware + API routes)
```

**Key files**:
- `lib/auth/password.ts` — `hashPassword`, `verifyPassword`
- `lib/auth/jwt.ts` — `signToken`, `verifyToken`, `JWTPayload`
- `lib/auth/session.ts` — `getCurrentUserFromHeaders`, `UserRole` enum, cookie operations
- `lib/auth/actions.ts` — `loginUser`, `logoutUser` Server Actions
- `middleware.ts` — Route guarding: `/dashboard/admin` → ADMIN only, `/dashboard/provider` → SERVICE_PROVIDER/ADMIN, `/dashboard/customer` → CUSTOMER/FLEET_MANAGER/ADMIN
- `lib/auth/permissions.ts` — `checkRole`, `verifyVehicleOwnership` server-side helpers

**RBAC roles**: CUSTOMER, SERVICE_PROVIDER, FLEET_MANAGER, ADMIN
- ADMIN: full access
- SERVICE_PROVIDER: manage service center, mechanics, appointments
- FLEET_MANAGER: manage own vehicles + fleet view
- CUSTOMER: manage own vehicles, bookings

**Key features implemented**:
- bcrypt password hashing (10,000 PBKDF2 iterations)
- JWT access tokens with expiration
- Secure HTTP-only cookies (`apex_session`)
- Role-based middleware protection
- Server-side ownership verification
- Password reset token flow (placeholder)

---

### Phase 3 — Vehicle Management

**Vehicle CRUD** with server-side ownership checks and IDOR prevention:

- **Vehicle listing** — `/dashboard/customer/vehicles` — displays vehicles owned by the user
- **Add vehicle** — `/dashboard/customer/vehicles/new` — create with owner enforcement
- **Vehicle details** — show make, model, year, license plate, VIN, mileage
- **Edit vehicle** — update permitted fields only (owner cannot be changed)
- **Delete vehicle** — prevent deletion if dependent records exist (bookings)

**Key files**:
- `app/dashboard/customer/vehicles/page.tsx` — vehicle list page
- `app/dashboard/customer/vehicles/[id]/edit/page.tsx` — edit vehicle
- `app/dashboard/customer/vehicles/new/page.tsx` — new vehicle form
- `lib/db.ts` — vehicle CRUD methods (findUnique, create, updateVehicle, deleteVehicle)
- `lib/auth/permissions.ts` — `verifyVehicleOwnership`

**Validation**:
- Required fields: make, model, year, license_plate
- Year constraint: 1900 <= year <= 2100
- license_plate UNIQUE constraint
- mileage >= 0

**IDOR protection**:
- All vehicle queries check owner_id matches authenticated user
- Admins and Service Providers can access all vehicles (business rule)
- Regular customers cannot access vehicles they don't own

**Database integration**:
- `vehicles` table: id, owner_id, make, model, year, license_plate, vin, mileage, created_at, updated_at
- Foreign key: owner_id → users(id) ON DELETE CASCADE
- Prisma `Vehicle` model maps to SQL schema

---

### Phase 4A — Service Center Management

**Service center view/edit** for admin-only access:

- **Service center view** — `/dashboard/admin/service-center` — displays current service center information
- **Admin-only access** — middleware enforces ADMIN role
- **Reuse existing `service_center` schema** — no redesign needed

**Key implementation**:
- `app/dashboard/admin/service-center/page.tsx` — service center management page
- `lib/db.ts` — `serviceCenter` CRUD methods added (findUnique, create, updateVehicle reuse)

**Service center schema** (from `database/schema.sql`):
```sql
CREATE TABLE service_center (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    operating_hours VARCHAR(100) DEFAULT 'Mon-Sat 8:00 AM - 6:00 PM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Prisma model** (`prisma/schema.prisma`):
- `ServiceCenter` maps directly to SQL table
- Fields: id, name, address, phone, email, operatingHours, createdAt, updatedAt
- Relations: mechanics (Mechanic[]), bookings (Booking[])

**Status**: Admin can view service center info. Edit functionality present but data is mocked in `lib/db.ts`.

---

### Phase 4B — Mechanic Management

**Mechanic listing** for admin-only access:

- **Mechanic listing** — `/dashboard/admin/mechanics` — displays mechanic list
- **Admin-only access** — middleware enforces ADMIN role
- **Service-center association** — mechanics linked to existing service center via `service_center_id`

**Key implementation**:
- `app/dashboard/admin/mechanics/page.tsx` — admin mechanic management page
- `lib/db.ts` — `mechanic` CRUD methods added (findUnique, create, update, delete)

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
- Mechanic listing displays name, specialization, phone, status
- "Add Mechanic" link navigates to create flow
- Admin authorization enforced via middleware
- Service center association preserved

**lib/db.ts mechanic methods**:
- `findUnique({ id })` — returns mock mechanic data
- `create({ data })` — creates mechanic associated with service center
- `update({ where, data })` — updates mechanic fields
- `delete({ where })` — deletes mechanic (placeholder, respects FK constraints)

---

## 5. TECHNOLOGY STACK

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 16.4.0 (App Router), React 19.3.0, TypeScript | App Router pages, Server Components, Client Components |
| **Styling** | Custom CSS with Tailwind-inspired patterns | Inline styles in JSX, consistent color palette |
| **Backend** | Next.js 16 App Router, Server Actions, Node.js Proxy | Route handlers, form submissions, dashboard route guard |
| **Database** | PostgreSQL 14+ (SQL-First) | All schemas in `database/*.sql`, Prisma for type generation |
| **ORM** | Prisma (type generation only) | `prisma db pull` generates types from SQL; `db.ts` is custom resilient layer |
| **Authentication** | bcrypt, jose (JWT), secure HTTP-only cookies | Password hashing, JWT signing, cookie-based sessions |
| **Validation** | Zod, React Hook Form | Form validation in UI layers |
| **Email** | Nodemailer (SMTP) | Configuration in `.env.example` |
| **Testing** | Jest, React Testing Library, Playwright | Test infrastructure present but limited coverage |
| **Deployment** | Vercel (frontend), PostgreSQL hosting | Not yet configured |

**Exact versions**:
- Next.js: 16.4.0
- React / React DOM: 19.3.0
- ESLint: 9.39.5 (latest peer-compatible major supported by the bundled Next.js ESLint plugins)
- eslint-config-next: 16.4.0
- TypeScript: 5.9.3
- Prisma: ^5.19.0
- bcrypt: 6.0.0
- jose: ^5.8.0
- Tailwind CSS: 4.3.3
- Nodemailer: 10.0.16

---

## 6. DATABASE ARCHITECTURE

### SQL-First Approach
- **Source of truth**: `database/schema.sql` — all tables, enums, constraints
- **Prisma integration**: `prisma/schema.prisma` maps to SQL; `prisma db pull` generates types
- **Migration**: Manual SQL execution in order: schema → functions → triggers → views → indexes → seed

### PostgreSQL Tables (from `database/schema.sql`)

| Table | Key Fields | Constraints |
|---|---|---|
| **users** | id, email, password_hash, role, phone, created_at, updated_at | role ENUM, email UNIQUE, password_hash NOT NULL |
| **vehicles** | id, owner_id, make, model, year, license_plate, vin, mileage | owner_id FK → users, license_plate UNIQUE, year CHECK |
| **service_center** | id, name, address, phone, email, operating_hours | all NOT NULL, operating_hours default |
| **mechanics** | id, service_center_id, name, specialization, phone, is_active | service_center FK → ON DELETE CASCADE |
| **service_types** | id, name, description, base_price, estimated_duration_minutes | name UNIQUE, base_price >= 0, duration > 0 |
| **parts** | id, name, part_number, description, unit_price, stock_quantity, reorder_threshold | part_number UNIQUE, stock_quantity >= 0 |
| **bookings** | id, customer_id, vehicle_id, service_type_id, mechanic_id, service_center_id, status, scheduled_date | FKs to users/vehicles/service_types/mechanics/service_center, status ENUM |
| **services** | id, booking_id, mechanic_id, diagnosis_notes, work_performed, labor_cost, started_at, completed_at | booking FK unique, labor_cost >= 0 |
| **service_parts** | id, service_id, part_id, quantity, unit_price_at_time | composite lookups, stock deduction |
| **invoices** | id, booking_id, invoice_number, subtotal, tax, total_amount, status | booking FK unique, invoice_number UNIQUE |
| **reviews** | id, booking_id, customer_id, rating, comment, created_at | booking FK unique, rating range |
| **notifications** | id, user_id, title, message, is_read, sent_at | user FK, is_read default false |
| **audit_logs** | id, table_name, record_id, action, changed_by, details, logged_at | changed_by FK → users, action ENUM |

### SQL Functions (`database/functions.sql`)
- `calculate_invoice_totals(subtotal DECIMAL, tax DECIMAL) → total DECIMAL` — auto-calculate invoice totals
- `deduct_part_inventory(part_id INT, quantity INT) → VOID` — reduce stock on part consumption, trigger on service_parts insert

### Triggers (`database/triggers.sql`)
- `trigger_set_updated_at()` — auto-sets `updated_at` on affected tables before update
- `trigger_deduct_part_inventory()` — fires on `service_parts` INSERT to deduct inventory

### Views (`database/views.sql`)
- `vw_customer_booking_history` — customer's booking history summary
- `vw_low_stock_parts` — parts below reorder threshold
- `vw_service_analytics` — service center analytics (revenue, bookings, mechanics workload)

### Indexes (`database/indexes.sql`)
- Indexes on foreign keys: `owner_id`, `service_center_id`, `mechanic_id`, `booking_id`
- Unique indexes: `email`, `license_plate`, `part_number`, `invoice_number`
- Performance indexes: status fields, date ranges, lookup columns

### Analytics (`database/analytics.sql`)
- CTEs and window functions for Monthly Revenue MoM growth
- Mechanic workload ranking (COUNT of bookings per mechanic)
- Low-stock parts detection

### Seed Data (`database/seed.sql`)
- Sample users with all 4 roles
- Sample service center
- Sample mechanics
- Sample vehicles, bookings, services, parts
- Sample invoices and reviews

---

## 7. AUTHENTICATION ARCHITECTURE

```text
Registration
    ↓
Password hashing (bcrypt, 16-char salt + 10000 PBKDF2 rounds)
    ↓
User record stored (id, name, email, password_hash: "salt:hash", role, phone, timestamps)
    ↓
Login
    ↓
JWT creation (jose HS256, sub, userId, email, role, iat, exp)
    ↓
HTTP-only cookie set (apex_session = token)
    ↓
Server-side verification (middleware + API routes + Server Actions)
    ↓
RBAC + ownership checks enforce authorization
```

### Key files:

- `lib/auth/password.ts`:
  - `hashPassword(password) → Promise<string>` — salt + pbkdf2sha512
  - `verifyPassword(password, storedHash) → Promise<boolean>` — timing-safe compare

- `lib/auth/jwt.ts`:
  - `signToken(payload, expiresInSeconds?) → Promise<string>` — HS256 signing
  - `verifyToken(token) → Promise<JWTPayload | null>` — signature validation, expiration
  - `JWTPayload` interface: sub, userId, email, role, iat, exp

- `lib/auth/session.ts`:
  - `getCurrentUserFromHeaders(headers) → Promise<any | null>` — cookie extraction + token verify + DB user lookup
  - Returns safe user: { id, name, email, role } (omits passwordHash)
  - `UserRole` enum: CUSTOMER, SERVICE_PROVIDER, FLEET_MANAGER, ADMIN

- `lib/auth/actions.ts`:
  - `loginUser(email, password) → Promise<{ success: boolean; user?:; error?: }>` — Server Action
  - `logoutUser() → Promise<void>` — clears apex_session cookie

- `middleware.ts`:
  - Protected dashboard routes (`/dashboard/*`)
  - Cookie check: `apex_session` present?
  - Token verification: `verifyToken(sessionCookie)`
  - Role-based redirects:
    - `/dashboard/admin` + role ≠ ADMIN → `/dashboard`
    - `/dashboard/provider` + role ≠ SERVICE_PROVIDER/ADMIN → `/dashboard`
    - `/dashboard/customer` + role ≠ CUSTOMER/FLEET_MANAGER/ADMIN → `/dashboard`

- `.env.example`:
  - `JWT_SECRET="super-secret-jwt-key-change-in-production-123456"` — rotate in production

### Authentication flow diagram:
```text
User submits login
    ↓
API route /api/auth/login (Server Action)
    ↓
verifyPassword → if valid
    ↓
signToken(payload) → JWT
    ↓
Set cookie: apex_session=JWT
    ↓
Redirect to /dashboard
    ↓
Middleware on each /dashboard/* request
    ↓
verifyToken(cookies.apex_session)
    ↓
if valid + role check passes → render page
    ↓
if invalid → redirect to /login
```

---

## 8. ROLE MODEL

### Implemented Roles & Permissions

| Role | Can Access | Can Manage |
|---|---|---|
| **ADMIN** | All dashboards | Service center, mechanics, users, vehicles (all), bookings, invoices, parts, settings |
| **SERVICE_PROVIDER** | `/dashboard/provider`, `/dashboard/admin` (limited) | Service center, mechanics, appointments, parts (own location) |
| **FLEET_MANAGER** | `/dashboard/customer` | Own vehicles only, bookings for own vehicles |
| **CUSTOMER** | `/dashboard/customer` | Own vehicles, bookings, profile |

### Planned Roles (not yet implemented beyond above)
- No additional roles beyond CUSTOMER/SERVICE_PROVIDER/FLEET_MANAGER/ADMIN

### Permission enforcement:
- **Server-side only**: Never trust client-supplied role
- **Middleware**: Next.js middleware protects `/dashboard/*` routes
- **API routes**: Every backend endpoint checks user role
- **Database-level**: FK constraints + business logic prevent unauthorized changes

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
/dashboard/admin — ADMIN only (middleware)
  ├── /service-center — Service center management
  └── /mechanics — Mechanic management
/dashboard/provider — SERVICE_PROVIDER or ADMIN
  — Provider dashboard (vehicle/service management)
/dashboard/customer — CUSTOMER or FLEET_MANAGER
  ├── /vehicles — vehicle management
  └── /bookings
      ├── /new — create a PENDING service booking (Phase 4C.1)
      └── /[id] — view an owned booking's details and cancel while PENDING (Phase 4C.4)
```

**Protected routes**: All `/dashboard/*` routes require authentication and valid role.

**Route guards** (middleware.ts):
- No `apex_session` cookie → redirect to `/login`
- Invalid token → redirect to `/login`
- Wrong role for route → redirect to `/dashboard`

---

## 10. CURRENT FILE / ARCHITECTURE MAP

```text
 root/
 ├── app/                          # Next.js App Router pages & layouts
 │   ├── layout.tsx               # Root layout
 │   ├── page.tsx                 # Landing / Home page
 │   ├── (auth)/                  # Auth-related routes
 │   │   ├── login/              # Login page
 │   │   ├── register/           # Register page
 │   │   └── layout.tsx           # Auth layout
 │   ├── (dashboard)/             # Protected dashboard routes
 │   │   ├── layout.tsx           # Dashboard layout
 │   │   ├── customer/           # Customer dashboard
 │   │   │   └── vehicles/       # Vehicle list / [id]
 │   │   │   └── bookings/       # Booking creation, list, details, cancellation
 │   │   ├── provider/           # Provider dashboard
 │   │   └── admin/              # Admin dashboard
 │   │       ├── service-center/ # Service center page
 │       │       └── mechanics/ # Mechanic management page
 │   ├── api/                     # API routes (if added later)
 │   └── layout.tsx               # Root layout
 ├── database/                     # SQL-First Database definitions
 │   ├── schema.sql               # Core table definitions & enums (21KB)
 │   ├── migrations/              # Forward-only migrations for existing databases
 │   ├── functions.sql            # Stored SQL functions
 │   ├── triggers.sql             # Database triggers & automation
 │   ├── views.sql                # Operational and analytical views
 │   ├── indexes.sql              # Performance indexes
 │   ├── analytics.sql            # CTEs & Window function queries
 │   └── seed.sql                 # Sample seed data (13KB)
 ├── prisma/                       # Prisma configuration & schema
 │   └── schema.prisma             # Type generation schema
 ├── lib/                          # Utility libraries & database client
 │   ├── db.ts                    # Resilient DB persistence layer (in-memory + mock)
 │   ├── booking/                 # Booking services and focused Node tests
 │   ├── auth/                    # Authentication logic
 │   │   ├── actions.ts           # Login/Logout Server Actions
 │   │   ├── jwt.ts               # JWT sign/verify
 │   │   ├── password.ts          # bcrypt password hashing
 │   │   ├── permissions.ts       # RBAC checks
 │   │   └── session.ts           # Session management, getCurrentUserFromHeaders
 │   ├── email.ts                 # Nodemailer SMTP service (placeholder)
 │   └── services/                # Business logic services (placeholder)
 ├── docs/                         # Project documentation & governance
 │   ├── AGENT_GOVERNANCE.md      # Agent responsibilities & governance
 │   └── ARCHITECTURE_DECISIONS.md # ADRs for key architectural decisions
 ├── .env.example                 # Environment variables template
 ├── PLAN.md                      # Detailed development plan (39 tasks, 12 phases)
 ├── README.md                    # Project overview + team + tech stack
 ├── package.json                 # Dependencies + scripts
 └── .gitignore                   # Git ignore rules
```

---

## 11. NOT IMPLEMENTED YET

```text
## NOT IMPLEMENTED
```

- **Mechanic availability** — NOT STARTED — No availability tracking or scheduling system
- **Remaining booking lifecycle management** — NOT STARTED — Creation, listing, details, and customer cancellation are implemented; editing, rescheduling, confirmation/rejection, staff management, and other transitions are not implemented
- **Appointment scheduling** — NOT STARTED — No calendar/availability slot system
- **Mechanic assignment** — NOT STARTED — No mechanism to assign mechanics to bookings
- **Service records** — NOT STARTED — No service execution tracking beyond basic bookings
- **Parts management** — NOT STARTED — Inventory tracking exists in schema but no UI CRUD
- **Inventory deduction** — NOT STARTED — `deduct_part_inventory` trigger exists but not wired to UI
- **Invoicing** — NOT STARTED — Invoice schema exists but no generation UI or PDF
- **Payments** — NOT STARTED — Explicitly excluded (invoice-only, no payment processing)
- **Reviews & ratings** — NOT STARTED — Review model exists in DB but no submit UI
- **Email notifications** — NOT STARTED — Nodemailer configured in `.env.example` but no email-sending logic implemented
- **Analytics/dashboard enhancements** — NOT STARTED — Views exist in DB but no dashboard widgets
- **Testing expansion** — NOT STARTED — Test infrastructure present but limited coverage
- **Full UI polish** — NOT STARTED — Functional UIs exist but styling varies; no responsive breakpoints
- **Deployment configuration** — NOT STARTED — No Vercel/Railway/Supabase configs
- **Advanced SQL features usage** — NOT STARTED — CTEs, window functions, triggers exist in `database/` but not called from app layer

Each item is marked appropriately:
```text
NOT STARTED    — Not begun
PARTIALLY IMPLEMENTED — DB/schema exists, UI/business logic not complete
PLANNED        — In roadmap but not started
```

---

## 12. CURRENT STOP POINT

```text
## CURRENT STOP POINT
```

Development is stopped after **Phase 4C.4 — Customer Booking Cancellation**.

- Customers can submit a new booking request for their own vehicle and an existing service type. Requests are created with `PENDING` status.
- Booking creation uses Prisma against PostgreSQL. The legacy user, vehicle, service-center, and mechanic methods in `lib/db.ts` remain mock placeholders; booking creation itself is not in-memory.
- A live PostgreSQL connection was not available during verification (`DATABASE_URL` and `.env` were absent), so database runtime connectivity was not verified.
- The customer booking list is server rendered and queries Prisma/PostgreSQL with a `customerId` filter derived from the signed session. It shows booking ID, vehicle, service, requested date, status, and creation date.
- The customer booking details page queries by both booking ID and customer ID from the signed session. It shows schema-backed booking, vehicle, service type, service center, dates, status, and optional notes. A mismatched customer/booking pair returns not found.
- Booking listing has empty, loading, and safe error states.
- Customers can cancel only their own `PENDING` booking. The details page asks for confirmation and hides the control after status changes. Confirmed, in-progress, completed, invoiced, and already cancelled bookings cannot be cancelled through this operation.
- Cancellation checks session and customer/fleet-manager role server-side. A single conditional update matches booking ID, session customer ID, and `PENDING` status, then writes `CANCELLED`. Missing or non-pending bookings receive safe results; the client cannot supply customer ID or target status.
- `CANCELLED` was added to `database/schema.sql` and `prisma/schema.prisma`. Existing databases require applying `database/migrations/20261009_add_cancelled_booking_status.sql`; it was not applied because no real `DATABASE_URL` is configured.
- Other booking lifecycle and provider-management features remain NOT STARTED.
- A future session must NOT automatically begin Phase 4C or any other feature.
- Wait for explicit instructions from the user before implementing the next task.

Latest maintenance commit: **`5b5c633`** — `chore: remediate dependency and runtime issues`. Latest feature commit: **`feat: implement customer booking cancellation`** (current handoff commit on `main`).

Verification history:
- Focused booking tests: 18 passed with Node's built-in test runner, covering creation, listing, ownership, not found, and safe database errors.
- TypeScript: `npx tsc --noEmit` passed.
- Lint: `npm run lint` passed with no warnings or errors.
- Production build: `npm run build` passed and generated all 13 static pages. The prior Edge Runtime warning disappeared after replacing Node `crypto` with `jose` in the middleware JWT module. The build required elevated filesystem access to write generated `.next` output.
- Stage 1 maintenance verification: 5 JWT tests passed for valid and legacy-format HS256 tokens, modified signatures, expiration, and malformed tokens. The combined maintenance booking/JWT tests passed 23/23.
- Phase 4C.4 verification: `node --test lib/booking/booking-service.test.cjs lib/auth/jwt.test.cjs` passed 35/35 tests, including all cancellation eligibility, ownership, input, error, and simulated concurrency cases. These are unit tests with an in-memory fake repository, not PostgreSQL integration tests.
- Phase 4C.4 TypeScript: `npx tsc --noEmit` passed. Lint: `npm run lint` passed. Production build: `npm run build` passed.
- Previous checkpoint audit: findings were reduced from 19 to 1 critical Next.js package entry; this historical result was superseded by the Next.js 16 migration documented in Section 16.
- PostgreSQL: connection not attempted because neither the process environment nor a local `.env` contains `DATABASE_URL`. Configure `DATABASE_URL` with the actual PostgreSQL username, password, host, port, database name, and `?schema=public`; no credentials were created or printed.

---

## 13. FUTURE PHASE ORDER

Based on `PLAN.md` planned phase order:

```text
Phase 4C.1 — Booking Creation — COMPLETE (database connection not verified)
  • Customer booking form, server-side validation, ownership and service-type checks
  • New booking requests are stored through Prisma with PENDING status
Phase 4C.2 — Booking Listing — COMPLETE (database connection not verified)
  • Customer-scoped server-rendered booking list with loading, empty, and error states
Phase 4C.3 — Customer Booking Details — COMPLETE (build verified; database connection not verified)
  • Customer-scoped server-rendered details page; booking ID and authenticated customer ID are queried together
Phase 4C.4 — Customer Booking Cancellation — COMPLETE (migration added; database connection not verified)
  • Customer/fleet manager may cancel only their own PENDING booking; atomic conditional update writes CANCELLED
  • Forward migration: database/migrations/20261009_add_cancelled_booking_status.sql (not applied to a live database)
Phase 4C remaining — Lifecycle, availability, and provider appointment management — NOT STARTED

Phase 5 — Service Records & Parts — NOT STARTED
  • Service execution recording
  • Parts inventory consumption via triggers
  • Parts reorder management

Phase 6 — Invoicing — NOT STARTED
  • Invoice generation from completed bookings
  • Subtotal/tax/total calculation (trigger: calculate_invoice_totals)
  • Invoice PDF or display

Phase 7 — Reviews & Ratings — NOT STARTED
  • Submit review for completed services
  • Rating (1-5) and comment
  • Link to booking

Phase 8 — Email Notification System — NOT STARTED
  • Nodemailer SMTP integration
  • Triggered on booking status changes
  • Invoice generation notifications

Phase 9 — Admin Dashboard — NOT STARTED
  • System-wide oversight dashboard
  • User/vehicle/mechanic/booking summaries
  • Analytics widgets

Phase 10 — Testing & Quality Assurance — NOT STARTED
  • Unit tests (Jest)
  • Integration tests
  • E2E tests (Playwright)
  • Security audits

Phase 11 — Polish & Deployment — NOT STARTED
  • Responsive UI improvements
  • Vercel deployment configuration
  • Production hardening

The original plan has 39 tasks across 12 phases; remaining work is not re-estimated here.
```

> **Note**: Phases 4C.1–4C.4 implement customer booking creation, listing, details, and cancellation. Other booking lifecycle and provider-management functionality remains NOT STARTED.

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
- Prisma integration (type generation only)
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
Booking workflow: `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → INVOICED`, with `PENDING → CANCELLED` as a separate terminal customer outcome. The customer cancellation operation enforces ownership and the `PENDING` source state with an atomic conditional update; other lifecycle actions remain unimplemented.

### Authentication
Stateless authentication using JWT (signed via `jose`), password hashing with `bcrypt`, and secure HTTP-only cookies. Never trust client-supplied roles; enforce strict server-side authorization checks.

### Single Service Center
The project operates as a single service center model. No multi-location support. All mechanics, bookings, and parts belong to one service center.

---

## 16. KNOWN LIMITATIONS / TECHNICAL DEBT

### Mock/In-Memory DB Behavior
Most legacy methods in `lib/db.ts` remain placeholders that return mock data. Phase 4C.1 booking catalog lookups and booking creation use Prisma/PostgreSQL. The database connection was unavailable during implementation verification, so live persistence still needs an environment with `DATABASE_URL` and the SQL schema applied.

### Incomplete Test Coverage
The repository has no configured Jest/React Testing Library/Playwright packages or scripts. Phases 4C.1–4C.3 include focused tests using Node's built-in test runner; broad application test coverage remains incomplete.

### Verification Setup
ESLint uses the Next.js Core Web Vitals rules through ESLint 9 flat config. Migration verification: TypeScript, lint, Prisma client generation, production build, and 35 focused booking/JWT regression tests passed. The build uses Turbopack and reports the Proxy route; no Edge Runtime crypto warning was reported.

### Next.js 16 Security Migration (2026-10)
- Migrated Next.js 14.2.35 to stable Next.js 16.4.0, React/React DOM 19.3.0, ESLint 9.39.5, and `eslint-config-next` 16.4.0 using regular npm peer resolution.
- Converted `cookies()` and dynamic route `params` to asynchronous APIs, migrated the booking form to React 19 `useActionState`, and renamed `middleware.ts` to `proxy.ts` while preserving the matcher, JWT verification, login redirect, and role checks.
- Corrected the legacy `use action` directive in auth server actions to supported `use server`; Next 16 rejected the old directive during production compilation.
- ESLint now uses flat config and `eslint .`; Next updated `tsconfig.json` to its automatic JSX runtime and development type include.
- ESLint 10 was evaluated but Next's bundled import, JSX accessibility, and React plugins restrict their peer ranges to ESLint 9. The migration therefore keeps ESLint 9.39.5 with normal peer resolution; npm currently marks that final ESLint 9 release unsupported, so this remains a toolchain maintenance item until the Next config plugins accept ESLint 10.
- Audit before migration: 1 critical Next.js package entry. Post-migration `npm audit`: 0 critical and 5 high, all in the lint-only chain `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. The npm registry currently lists `braces` 3.0.3 as latest; no patched release or safe automatic fix is available. Do not use `npm audit fix --force` (npm proposes a major downgrade to eslint-config-next 14.2.35). `npm audit --omit=dev` reports 0 vulnerabilities.
- PostgreSQL was not contacted and no database migration was applied because no real `DATABASE_URL` is configured. Booking/JWT unit tests use an in-memory repository; runtime database connectivity remains unverified.

PostgreSQL runtime connectivity remains unverified. Provide `DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>?schema=public` in the ignored local `.env` file or process environment with real connection details before validating Prisma or applying the migration.

### Partially Implemented CRUD
- Service center edit: UI present, data mocked in `lib/db.ts`
- Mechanic add/edit/delete: Listing and add link present, full form CRUD not implemented
- Vehicle edit/delete: Full CRUD implemented with ownership checks

### Database Triggers Partially Wired
- `trigger_set_updated_at()` auto-sets timestamps
- `trigger_deduct_part_inventory()` exists in SQL but not called from application layer
- No API routes or Server Actions invoke the triggers from the Next.js app

### Authentication — Development vs Production
- `JWT_SECRET` in `.env.example` is a hardcoded default (`super-secret-jwt-key-change-in-production-123456`)
- No password reset flow fully implemented
- Session management relies on in-memory user lookup in `getCurrentUserFromHeaders`

### UI Styling Inconsistency
- Some pages use inline styles, some use CSS classes
- No consistent Tailwind configuration or design system
- Page layouts vary in structure

### No TypeScript Generation from SQL
- `prisma db pull` has not been run to regenerate types after SQL changes
- `prisma/schema.prisma` manually maintained; may diverge from `database/schema.sql`

### Email Service Not Integrated
- Nodemailer configured in `.env.example` but no SMTP transport created
- No email-sending Server Actions or API routes
- Notifications table exists but no creation logic in app layer

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
8. Review `git status` and `git diff`, then stage only files changed for the explicitly requested task:
   ```bash
   git add <reviewed-files>
   ```
9. Update `PROJECT_STATUS.md` to reflect the completed task and phase status.
10. **STOP and wait for further instructions.** Do not automatically continue to the next phase.

>The next session must NOT assume it should automatically continue development. Each task must be explicitly requested.

---

## 18. FINAL VALIDATION

After creating this file:

1. ✅ Read the entire file for contradictions.
2. ✅ Compare phase status against the actual repository; current phases 4C.1–4C.4 are recorded above.
3. ✅ Verify the latest Git commit matches expectations.
4. ✅ Verify no secrets are included (`.env`, credentials, API keys not committed).
5. ✅ Verify no unimplemented booking lifecycle or later-phase functionality is marked complete.
6. ✅ Ensure the document is concise enough to be useful as a handoff document.
7. ✅ Follow the explicit scope of the user's current task.
8. ✅ Do NOT implement future features without user instructions.

---

## 19. GIT

After creating the status document:

```bash
git status
git diff
# Review changes — ensure only PROJECT_STATUS.md is new/modified
```

Commit only the new/updated status document:

```bash
git add PROJECT_STATUS.md
git commit -m "docs: add project status handoff"
git push origin main
```

Do not force push.

---

## 20. FINAL RESPONSE

The latest implementation and Git checkpoint are reported in the completion message for the current task. Stop after the explicitly requested phase; do not begin another development task without user instructions.
