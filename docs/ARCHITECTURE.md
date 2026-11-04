# SeatWise System Architecture & Engineering Specification

## 1. Executive Summary

**SeatWise** is an enterprise-grade examination and classroom seating management system engineered for **Jain (Deemed-to-be University)**, Faculty of Engineering and Technology (FET). The platform solves complex multi-batch exam seating challenges using mathematical discrete optimization, graph theory (bipartite 2-coloring, maximum independent sets), and Google OR-Tools CP-SAT constraint programming.

---

## 2. Clean Architecture & Layered Decomposition

SeatWise follows Clean Architecture principles, ensuring strict separation of concerns, decoupling business logic from presentation, and isolating external infrastructure dependencies.

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                     │
│  - Vite + React 18 SPA (TypeScript, Tailwind CSS)          │
│  - Pure UI Components (DeskGrid, StatCard, StatusBadge)     │
│  - React Contexts & Hooks (useDashboardStats, useSeating)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON / SSE
┌──────────────────────────────▼──────────────────────────────┐
│                      Application API Layer                  │
│  - FastAPI REST Endpoints (Versioned under /api)            │
│  - Request Validation & Schema Serialization (Pydantic v2)  │
│  - Global Error Handling & Normalized RFC Responses         │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Domain Services Layer                  │
│  - Dashboard Metrics Service (Aggregate Calculations)       │
│  - Timetable Parser Service (Excel Matrix Ingestion)        │
│  - Seating Generation Service (Engine Orchestration)        │
│  - Mathematical Analysis Service (Graph Independence)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                      Optimization Engine                    │
│  - Phase 1: Capacity & Parity Bounds (alpha(G) check)       │
│  - Phase 2: Checkerboard 2-Coloring Partitioning            │
│  - Phase 3: Multi-Hall CP-SAT Constraint Programming        │
│  - Phase 4: Strict Deterministic Validation                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Infrastructure & Storage                 │
│  - Supabase PostgreSQL 15 (Row-Level Security, Views, RPCs) │
│  - Asymmetric JWT Authentication (.well-known/jwks.json)    │
│  - Static Dist Hosting & Vercel Serverless Functions        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

### 3.1 Frontend (`frontend/src/`)
```
frontend/src/
├── config/                  # Centralized typed environment & constants
│   ├── env.ts               # Type-safe environment access & validation
│   └── constants.ts         # App-wide constants (pagination, roles, limits)
├── context/                 # Application state management
│   ├── AuthContext.tsx      # User session, JWT token, role privileges
│   ├── NotificationContext.tsx # Toast alerts (success, error, warning, info)
│   ├── SeatingContext.tsx   # Active exam, room grids, policy state
│   └── index.ts
├── hooks/                   # Custom business logic hooks
│   ├── useAuth.ts           # Authentication & role authorization
│   ├── useNotification.ts   # System notification dispatching
│   ├── useAsync.ts          # Generic async promise state wrapper
│   ├── useDashboardStats.ts # Dashboard data aggregation & chart parsing
│   ├── useTimetable.ts      # Timetable search, filter & preview logic
│   ├── useSeatingPlanner.ts # Seat moves, swaps, locks, policy validation
│   └── index.ts
├── components/
│   ├── common/              # Reusable presentational UI primitives
│   │   ├── ErrorBoundary.tsx   # React crash boundary with recovery UI
│   │   ├── ToastContainer.tsx  # Floating animated toast notifications
│   │   ├── LoadingSpinner.tsx  # Standardized loading indicator
│   │   ├── EmptyState.tsx      # Consistent empty data placeholders
│   │   ├── StatCard.tsx        # KPI metric cards with trends
│   │   ├── StatusBadge.tsx     # Color-coded badge pills
│   │   ├── Modal.tsx           # Accessible backdrop dialog modals
│   │   └── index.ts
│   ├── seating/             # Seating designer components
│   │   ├── DeskGrid.tsx        # Interactive room desk layout grid
│   │   ├── PolicyConfigurator.tsx # Optimization rule checkboxes
│   │   ├── SeatingLegend.tsx   # Visual status / color code guide
│   │   └── index.ts
│   ├── layout/              # Structural chrome (AppLayout, Navbar, Sidebar)
│   ├── landing/             # Public marketing landing sections
│   └── ui/                  # Tailored interactive visual widgets
├── services/
│   ├── api/                 # Modular domain API client modules
│   │   ├── client.ts        # Typed fetcher with ApiError handling
│   │   ├── authApi.ts
│   │   ├── dashboardApi.ts
│   │   ├── universityApi.ts
│   │   ├── timetableApi.ts
│   │   ├── studentsApi.ts
│   │   ├── facultyApi.ts
│   │   ├── roomsApi.ts
│   │   ├── classroomApi.ts
│   │   ├── examsApi.ts
│   │   ├── mathApi.ts
│   │   ├── reportsApi.ts
│   │   └── index.ts
│   ├── api.ts               # Backward-compatible API facade
│   └── supabase.ts          # Supabase client instantiation
├── types/                   # TypeScript interfaces and domain models
│   └── index.ts
└── utils/                   # Pure helper functions
    ├── formatting.ts        # Date, time, roll number, percentage formatters
    ├── validation.ts        # Form, roll number, and coordinate validators
    ├── seatingMath.ts       # Client-side graph theory & conflict checks
    ├── exportHelpers.ts     # CSV generation and download utilities
    └── index.ts
```

### 3.2 Backend (`backend/app/`)
```
backend/app/
├── algorithms/              # Core mathematical seating engine
│   ├── __init__.py          # Engine exports (generate_seating, Policy, Hall)
│   ├── checkerboard.py      # Bipartite grid 2-coloring allocation
│   ├── engine.py            # 4-stage pipeline orchestrator
│   ├── independence.py      # Graph independence bound alpha(G)
│   ├── solver.py            # OR-Tools CP-SAT discrete constraint model
│   └── validation.py        # Independent deterministic constraint validator
├── database/                # Database clients & migrations
│   ├── client.py            # Supabase service role client singleton
│   └── schema.sql           # Canonical PostgreSQL DDL
├── routes/                  # FastAPI modular route controllers
│   ├── auth_routes.py
│   ├── classroom_seating_routes.py
│   ├── dashboard_routes.py
│   ├── exam_routes.py
│   ├── exam_seating_routes.py
│   ├── faculty_routes.py
│   ├── math_routes.py
│   ├── report_routes.py
│   ├── room_routes.py
│   ├── seating_routes.py
│   ├── student_routes.py
│   ├── timetable_routes.py
│   └── university_routes.py
├── schemas/                 # Pydantic v2 request/response models
│   └── index.py
├── services/                # Business logic services
│   ├── dashboard_service.py # Metrics aggregation and chart summaries
│   ├── math_service.py      # Grid capacity and independence checks
│   ├── seating_service.py   # Seating generation orchestration
│   ├── timetable_parser.py  # Excel workbook parser
│   └── __init__.py
├── utils/                   # Shared utilities
│   ├── errors.py            # ApiError & global exception handlers
│   └── uuid_helper.py       # Deterministic UUID v5 normalization
├── config.py                # Pydantic Settings environment configuration
├── auth.py                  # JWT verification & role-based dependencies
└── main.py                  # Application entrypoint & static asset mounting
```

---

## 4. Seating Algorithm Pipeline

SeatWise features two operating modes:
- **Mode A (Classroom Seating)**: Single batch mapped across a teaching hall for regular semester lectures.
- **Mode B (Examination Seating)**: Multi-batch interleaved seating across multiple approved exam halls with anti-cheating separation constraints.

### 4-Stage Optimization Pipeline:
1. **Pre-Flight Feasibility Check**:
   - Total capacity check: $\sum N_{batch} \le \sum U_{usable}$
   - Maximum Independent Set bound: $\max(N_{batch}) \le \alpha(G)$
   - On a grid $P_R \times P_C$, $\alpha(G) = \lceil \frac{R \cdot C}{2} \rceil$.
2. **Checkerboard 2-Coloring Fast Path**:
   - When exactly two candidate batches are allocated, the engine assigns students to even $(r+c \equiv 0)$ and odd $(r+c \equiv 1)$ partitions in $O(1)$ time.
3. **OR-Tools CP-SAT Constraint Programming Solver**:
   - Used for $k \ge 3$ batches or non-standard room geometries.
   - Variables: Boolean decision variables $x_{s, h, r, c} \in \{0, 1\}$.
   - Constraints:
     - Injective assignment (at most 1 student per seat).
     - Single placement (each student seated exactly once).
     - Horizontal adjacency: $\forall (r, c), (r, c+1): \text{Batch}(r, c) \neq \text{Batch}(r, c+1)$.
     - Vertical adjacency: $\forall (r, c), (r+1, c): \text{Batch}(r, c) \neq \text{Batch}(r+1, c)$.
     - Diagonal adjacency (optional): $\forall (r, c), (r+1, c \pm 1): \text{Batch}(r, c) \neq \text{Batch}(r+1, c \pm 1)$.
4. **Deterministic Validation**:
   - Every solution is independently audited against all policy constraints before persisting to database.
