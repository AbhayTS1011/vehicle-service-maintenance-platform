# Vehicle Service & Maintenance Platform

A production-quality, database-driven vehicle service and maintenance management platform built with Next.js, TypeScript, PostgreSQL, and Prisma.

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

The **Vehicle Service & Maintenance Platform** is a centralized web application designed for a single vehicle service center. It manages the complete vehicle-service lifecycle:

```text
Customer → Vehicle → Service Booking → Mechanic Assignment → Service → Parts Used → Invoice → Review
```

This project goes beyond a simple CRUD application by demonstrating practical DBMS concepts, including relational database design, 3NF normalization, transactions, concurrency control, stored functions, triggers, views, indexing, CTEs, and window functions.

---

## Problem Statement

Vehicle service centers must coordinate multiple complex entities—customers, vehicles, service appointments, mechanics, spare parts inventory, service records, and invoices. Manual or disconnected systems make it difficult to:
- Track multi-vehicle customer service histories.
- Manage mechanic workloads and prevent double-booking race conditions.
- Maintain real-time inventory consistency during part consumption.
- Generate reliable operational invoices and service analytics.

This project solves these challenges through a robust PostgreSQL database-backed system with rigorous referential integrity and automated lifecycle tracking.

---

## Objectives

- Design a normalized relational PostgreSQL database (3NF).
- Support individual customers and multi-vehicle fleet management.
- Provide complete service booking lifecycle tracking.
- Enable service providers to manage mechanics, appointments, and inventory.
- Automate invoice calculations and part stock deductions via database triggers/functions.
- Implement secure authentication (bcrypt + JWT) and Role-Based Access Control (RBAC).
- Demonstrate advanced SQL features (Views, CTEs, Window Functions).

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS / Custom Styling |
| **Backend** | Next.js API Routes, Server Actions, Business Logic Layer |
| **Database** | PostgreSQL 14+ (SQL-First Approach) |
| **ORM / Type Generation** | Prisma (used strictly for type generation and type-safe access) |
| **Authentication** | bcrypt, jose (JWT), secure HTTP-only cookies |
| **Validation & Forms** | Zod, React Hook Form |
| **Email Service** | Nodemailer (SMTP) |
| **Testing** | Jest, React Testing Library, Playwright |
| **Deployment** | Vercel (Frontend), PostgreSQL hosting (Database) |

---

## Database Architecture (SQL-First)

Unlike typical Prisma-first workflows, this project enforces an **SQL-first** architecture:

```text
SQL Schema Definitions (database/*.sql)
   ↓
PostgreSQL Database
   ↓
Prisma Type Generation (`prisma db pull` / client)
   ↓
Type-Safe Application Layer
```

### Core Entities (3NF Normalized)
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
12. **notifications**: Notification history.
13. **audit_logs**: System audit trail.

---

## Advanced DBMS Features

- **Transactions & Concurrency**: Atomic operations for service bookings, mechanic assignments, and inventory deductions with row-level locking support.
- **Triggers**: Automated `updated_at` timestamps and real-time inventory reduction (`deduct_part_inventory`) triggered upon part consumption.
- **Functions**: Stored procedures for invoice subtotal/tax/total calculation (`calculate_invoice_totals`).
- **Views**: Pre-compiled operational summaries (`vw_customer_booking_history`, `vw_low_stock_parts`, `vw_service_analytics`).
- **Indexes**: Optimized lookup indexes on foreign keys, email addresses, license plates, and status fields.
- **CTEs & Window Functions**: Advanced analytics queries for Monthly Revenue MoM growth calculation and Mechanic workload ranking.

---

## Booking Workflow

```text
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → INVOICED
```

Invalid state transitions are strictly rejected by database constraints and backend business logic.

---

## System Architecture

```text
graph TB
    subgraph Frontend Layer
        A[Next.js App Router]
        B[Server / Client Components]
    end

    subgraph Backend Layer
        C[API Routes / Server Actions]
        D[Business Logic & RBAC]
    end

    subgraph Data Layer
        E[Prisma Type Layer]
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
├── app/                  # Next.js App Router pages & layouts
│   ├── globals.css       # Global stylesheet
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing / Home page
├── database/             # SQL-First Database definitions
│   ├── schema.sql        # Core table definitions & enums
│   ├── functions.sql     # Stored SQL functions
│   ├── triggers.sql      # Database triggers & automation
│   ├── views.sql         # Operational and analytical views
│   ├── indexes.sql       # Performance indexes
│   ├── analytics.sql     # CTEs & Window function queries
│   └── seed.sql          # Sample seed data
├── prisma/               # Prisma configuration & schema
│   └── schema.prisma     # Type generation schema
├── lib/                  # Utility libraries & database client
│   └── db.ts             # PrismaClient singleton
├── docs/                 # Project documentation & governance
│   ├── AGENT_GOVERNANCE.md
│   └── ARCHITECTURE_DECISIONS.md
├── .env.example          # Environment variables template
├── PLAN.md               # Detailed development plan
└── README.md             # Project README
```

---

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
Execute the SQL scripts in your PostgreSQL instance in the correct order:
1. `database/schema.sql`
2. `database/functions.sql`
3. `database/triggers.sql`
4. `database/views.sql`
5. `database/indexes.sql`
6. `database/seed.sql`

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
| **Phase 1** | Foundation & Infrastructure | ✅ Completed |
| **Phase 2** | Authentication & Authorization | ⏳ Planned |
| **Phase 3** | Vehicle Management | ⏳ Planned |
| **Phase 4** | Service Center & Mechanic Management | ⏳ Planned |
| **Phase 5** | Booking System | ⏳ Planned |
| **Phase 6** | Service Records & Parts | ⏳ Planned |
| **Phase 7** | Invoicing | ⏳ Planned |
| **Phase 8** | Reviews & Ratings | ⏳ Planned |
| **Phase 9** | Email Notification System | ⏳ Planned |
| **Phase 10** | Admin Dashboard | ⏳ Planned |
| **Phase 11** | Testing & Quality Assurance | ⏳ Planned |
| **Phase 12** | Polish & Deployment | ⏳ Planned |

---

## Security

- Password hashing via `bcrypt`.
- Stateless authentication using JWT (`jose`) and secure cookies.
- Server-side Role-Based Access Control (RBAC).
- Parameterized queries and strict Zod input validation.
- Sensitive credentials excluded via `.gitignore`.

---

## License

This project is developed as part of university coursework at PES University.
