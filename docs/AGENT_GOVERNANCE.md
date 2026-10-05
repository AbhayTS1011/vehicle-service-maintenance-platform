# Agent Governance & Architecture - Vehicle Service & Maintenance Platform

## 1. Environment & Capabilities Audit
- **OpenCode Built-in Agents**: `explore`, `general`.
- **OpenCode Tools**: `read`, `write`, `edit`, `glob`, `grep`, `bash`, `task`, `skill`, `todowrite`, `question`, `webfetch`.
- **Invocation Mechanism**: Sub-agents are invoked via the `task` tool (`subagent_type: "general"` or `"explore"`), with specific prompts defining their role, ownership, and scope.
- **Skill System**: The `skill` tool loads specialized guidance. Since project-specific custom agent files are not pre-configured in `.opencode/`, the Master Orchestrator delegates specialized tasks directly using structured task prompts adhering to strict domain boundaries and governance rules.

---

## 2. Agent Team & Responsibilities (Consolidated Architecture)

To maintain rigorous code quality and prevent module conflicts, responsibilities are consolidated into 6 core agent divisions under the **Master Orchestrator**:

### 1. Master Orchestrator
- **Role**: Overall project coordination, phase gating, task sequencing, integration verification.
- **Scope**: Entire repository.

### 2. Database & SQL Specialist (Database Architect + PostgreSQL Expert + Concurrency Specialist)
- **Role**: Relational schema design, normalization (3NF), SQL-first schema definition (`database/schema.sql`, `functions.sql`, `triggers.sql`, `views.sql`, `indexes.sql`, `seed.sql`), transactions, row-level locking, race condition prevention, Prisma type generation.
- **Scope**: `database/`, `prisma/`.

### 3. Backend & Auth Specialist (Backend + Auth + Domain Agents)
- **Role**: Next.js API routes, Server Actions, business logic, JWT authentication, RBAC authorization middleware, booking lifecycle validation, fleet management, inventory transactions, invoice calculation logic, notification service (Nodemailer).
- **Scope**: `app/api/`, `lib/auth.ts`, `lib/db.ts`, `lib/email.ts`, `lib/services/`.

### 4. Frontend & UI Specialist (Frontend + Customer, Provider, Admin UI)
- **Role**: Next.js App Router pages, layouts, Tailwind CSS styling, responsive components, dashboards for Customer, Service Provider, and Admin roles, form handling (React Hook Form + Zod).
- **Scope**: `app/(auth)/`, `app/(dashboard)/`, `components/`.

### 5. Quality, Security & Analytics Specialist (Testing, Security, Code Review, Analytics)
- **Role**: Unit tests (Jest), component tests (React Testing Library), E2E/concurrency tests (Playwright), security audits (OWASP, SQLi/XSS/CSRF prevention), advanced SQL analytics (CTEs, window functions, revenue/workload views), code reviews.
- **Scope**: `tests/`, analytics queries in `database/analytics.sql`, security verification.

### 6. DevOps, Documentation & Viva Specialist (DevOps, Documentation, Viva)
- **Role**: Git workflow, deployment configuration, comprehensive documentation (README, architecture, setup), academic viva preparation explaining DBMS concepts (normalization, locking, triggers, views).
- **Scope**: `README.md`, `docs/`, deployment configs.

---

## 3. File Ownership Map

| Path / Module | Primary Responsible Agent | Supporting Agent |
| :--- | :--- | :--- |
| `database/**/*.sql` | Database & SQL Specialist | Master Orchestrator |
| `prisma/schema.prisma` | Database & SQL Specialist | Backend Specialist |
| `lib/auth.ts`, middleware | Backend & Auth Specialist | Security Specialist |
| `lib/db.ts`, `lib/email.ts`, `lib/services/*` | Backend & Auth Specialist | Database Specialist |
| `app/api/**/*` | Backend & Auth Specialist | Database Specialist |
| `app/(auth)/`, `app/(dashboard)/**/*` | Frontend & UI Specialist | Backend Specialist |
| `components/**/*` | Frontend & UI Specialist | - |
| `tests/**/*` | Quality & Testing Specialist | Backend & Database Specialists |
| `docs/**/*` | Documentation & Viva Specialist | Master Orchestrator |

---

## 4. Agent Dependency Graph

```
Database & SQL Specialist (Schema, Functions, Triggers, Views, Indexes, Seed)
  ↓
Backend & Auth Specialist (Auth, RBAC, Services, API Routes, Server Actions)
  ↓
Frontend & UI Specialist (Dashboards, Client/Server Components, Forms)
  ↓
Quality, Security & Analytics Specialist (Unit/Integration/E2E/Concurrency Tests, Security Audit)
  ↓
DevOps, Documentation & Viva Specialist (Final Polish, Deployment & Viva Prep)
```

---

## 5. Definition of Done & Review Process
1. **Implementation**: Code adheres strictly to TypeScript strict mode (`noImplicitAny`, etc.) and SQL-first principles.
2. **Database Integrity**: All transactions use proper isolation and row-level locking where concurrency is involved (e.g. mechanic assignment, inventory deduction).
3. **Verification**: Automated tests pass successfully.
4. **Code Review**: Checked for security vulnerabilities, type safety, and architectural consistency before marking complete.
