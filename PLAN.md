# **PLAN.md - Vehicle Service Platform**

## **Problem Statement**

Build a comprehensive vehicle service booking and fleet management platform that enables individual vehicle owners to manage multiple vehicles, book services with a single service center, track appointments through their complete lifecycle, and receive email notifications. The system supports role-based access for Customers, Service Providers, Fleet Managers, and Admins.

---

## **Requirements**

### **Gathered from User Input:**

1. **Platform Type**: 
   - Booking platform for vehicle services
   - Fleet management for individual owners with multiple vehicles
   - Single service center operation

2. **Core Entities**:
   - Users (with role-based access)
   - Vehicles (with fleet support)
   - Service Center (single location)
   - Services/Service Types
   - Bookings/Appointments
   - Invoices
   - Parts/Inventory
   - Reviews/Ratings
   - Mechanics

3. **Technical Stack**:
   - **Database**: PostgreSQL with Prisma ORM (SQL-first approach)
   - **Backend/Frontend**: Next.js 14+ (App Router)
   - **Authentication**: Email/password (simple auth)
   - **Notifications**: Email only (no SMS, no payment gateway)
   - **Type Safety**: TypeScript throughout

4. **User Roles**:
   - **Customer**: Books services for their vehicles
   - **Service Provider**: Manages service center, mechanics, appointments
   - **Fleet Manager**: Manages multiple vehicles (customer with fleet view)
   - **Admin**: System-wide administration and oversight

5. **Booking Workflow States**:
   - PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → INVOICED

6. **Key Features**:
   - Multi-vehicle management per user
   - Service scheduling with availability tracking
   - Complete appointment lifecycle management
   - Invoice generation (no payment tracking)
   - Parts/inventory management
   - Review and rating system
   - Email notifications at each workflow stage
   - Role-based dashboards

---

## **Background**

### **Existing Specification Analysis** (from PDF):
The PDF document provides a MongoDB-based schema with 9 entities. We will adapt this to a relational PostgreSQL schema while maintaining the core business logic:

**Schema Adaptations**:
- MongoDB's document model → Relational tables with proper foreign keys
- Simplified to single service center model
- Removed payment tracking (invoice only)
- Removed location/geolocation features
- Email notifications only
- Add junction tables for many-to-many relationships
- Implement proper indexing for performance
- Add timestamps and soft deletes where appropriate
- Normalize data while maintaining query performance

**Technology Decisions**:
- **SQL-first approach**: Define all schemas in raw SQL for maximum control
- **Prisma as type generator**: Use `prisma db pull` to generate types from existing SQL
- **Next.js App Router**: Modern React with server components
- **API Routes**: Next.js API routes for backend logic
- **Server Actions**: For form submissions and mutations

---

## **Proposed Solution**

### **Architecture Overview**

``mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js App Router]
        B[Server Components]
        C[Client Components]
        D[Server Actions]
    end
    
    subgraph "Backend Layer"
        E[API Routes]
        F[Business Logic]
        G[Email Service]
    end
    
    subgraph "Data Layer"
        H[PostgreSQL Database]
        I[Prisma Client]
        J[SQL Functions/Triggers]
    end
    
    A --> B
    A --> C
    C --> D
    B --> E
    D --> E
    E --> F
    F --> I
    F --> G
    I --> H
    J --> H
``

### **Database Design**

**Core Tables** (SQL-first):
1. **users** - User accounts with role management
2. **vehicles** - Vehicle information linked to users
3. **service_center** - Single service center configuration
4. **mechanics** - Mechanic profiles linked to service center
5. **service_types** - Catalog of available services
6. **parts** - Parts inventory
7. **bookings** - Appointment records
8. **services** - Actual service records linked to bookings
9. **service_parts** - Junction table for services and parts used
10. **invoices** - Invoice generation
11. **reviews** - Customer reviews
12. **notifications** - Notification queue and history
13. **audit_logs** - System audit trail

**Advanced SQL Features**:
- **Functions**: Calculate availability, generate invoice totals, update booking status
- **Triggers**: Auto-update timestamps, log changes, send notifications
- **Views**: Dashboard summaries, analytics, reporting
- **Indexes**: Optimize common queries (user lookups, date ranges, status filters)

### **Application Structure**

``
vehicle-service-platform/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth-related routes
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── customer/           # Customer dashboard
│   │   ├── provider/           # Service provider dashboard
│   │   ├── admin/              # Admin dashboard
│   │   └── layout.tsx
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── vehicles/
│   │   └── notifications/
│   └── layout.tsx
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   ├── forms/                   # Form components
│   └── dashboard/               # Dashboard-specific components
├── lib/                         # Utility libraries
│   ├── auth.ts                  # Authentication logic
│   ├── db.ts                    # Database client
│   ├── email.ts                 # Email service
│   └── utils.ts                 # Helper functions
├── database/                     # SQL definitions
│   ├── schema.sql               # Table definitions
│   ├── functions.sql            # SQL functions
│   ├── triggers.sql             # SQL triggers
│   ├── views.sql                # SQL views
│   ├── indexes.sql              # Index definitions
│   ├── analytics.sql            # Analytics queries
│   └── seed.sql                 # Sample data
├── prisma/
│   └── schema.prisma            # Generated from SQL
├── tests/                        # Test suites
└── public/                       # Static assets
``

---

## **Task Breakdown**

### **Phase 1: Foundation & Infrastructure** (6 tasks)
### **Phase 2: Authentication & Authorization** (3 tasks)
### **Phase 3: Core Features - Vehicle Management** (2 tasks)
### **Phase 4: Service Center & Mechanic Management** (3 tasks)
### **Phase 5: Booking System** (4 tasks)
### **Phase 6: Service Records & Parts** (3 tasks)
### **Phase 7: Invoicing** (2 tasks)
### **Phase 8: Reviews & Ratings** (2 tasks)
### **Phase 9: Email Notification System** (3 tasks)
### **Phase 10: Admin Dashboard** (3 tasks)
### **Phase 11: Testing & Quality Assurance** (3 tasks)
### **Phase 12: Polish & Deployment** (5 tasks)

**Total: 39 Tasks across 12 Phases**

---

## **Technology Stack Summary**

- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL 14+
- **ORM**: Prisma (for type generation only)
- **Authentication**: JWT with jose, bcrypt
- **Email**: Nodemailer
- **Testing**: Jest, React Testing Library, Playwright
- **Styling**: Tailwind CSS (recommended)
- **Deployment**: Vercel (frontend), Railway/Supabase (database)

---

## **Success Criteria**

✅ **Functional Requirements Met**:
- Users can register/login with role-based access
- Customers can manage multiple vehicles (fleet)
- Customers can book appointments with single service center
- Bookings flow through complete lifecycle (5 states)
- Service providers manage mechanics and appointments
- Invoices auto-generate with accurate totals
- Reviews submitted for completed services
- Email notifications sent at each stage
- Admin dashboard provides system oversight
- Single service center operation
- No payment processing

✅ **Technical Requirements Met**:
- SQL-first database design with PostgreSQL
- Prisma used only for type generation
- Full TypeScript type safety
- Comprehensive test coverage
- Responsive UI working on mobile
- Performance optimized
- Secure authentication and authorization
- Complete documentation

---

**End of PLAN.md**
