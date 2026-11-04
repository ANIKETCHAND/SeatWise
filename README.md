# SeatWise — Smart Classroom & Examination Seating Management System

**SeatWise** is an enterprise-grade full-stack web application designed for **Jain (Deemed-to-be University)**, Faculty of Engineering and Technology (FET), to mathematically generate, validate, and manage conflict-free seating arrangements for both **daily academic classroom sessions** and **large-scale university examinations**.

---

## 1. System Capabilities

### Mode A: Regular Classroom Seating
- **Dynamic Timetable Linking**: Resolves real subjects, faculty, and room allocations across Monday–Saturday for 7 daily periods (P1–P7).
- **Interactive Visual Seating Grid**: Visual classroom board, teacher podium, desk states, and live student swaps.
- **Attendance Tracking**: Real-time present/absent toggling directly on the visual desk grid.
- **Export Formats**: Instant PDF Classroom Seating Charts and CSV rosters.

### Mode B: Examination Seating
- **Multi-Cohort & Multi-Hall Scaling**: Simultaneously distributes examinees across multiple approved examination halls.
- **Strict Anti-Cheating Constraints**: Prevents same-batch examinees from sitting horizontally, vertically, or diagonally adjacent.
- **Mathematical Optimization Engine**: Uses **Google OR-Tools CP-SAT** constraint programming alongside exact bipartite checkerboard solvers.
- **Student Seat Locator**: Instant roll-number search for examinees to locate hall, row, column, and desk number.
- **Notice Board Generator**: Printable PDF notices formatted for university bulletin boards and invigilator rosters.

### Mathematical Analysis & Optimization Engine
- **Dedicated Interactive Mathematics Page**: Visualizes the theoretical principles powering SeatWise:
  1. Set Theory & Injective Mapping ($f: S \to T$)
  2. Dirichlet's Pigeonhole Principle ($|S| \le |T|$)
  3. Graph Adjacency Modeling ($G = (V, E)$)
  4. Bipartite Checkerboard 2-Coloring ($\text{color}(r, c) = (r + c) \bmod 2$)
  5. Maximum Independent Set Bound ($\alpha(G) = \lceil R \times C / 2 \rceil$) & Kőnig's theorem for layouts with blocked desks
  6. Constraint Satisfaction Problem (CSP) formulation via CP-SAT

---

## 2. Architecture & Clean Folder Structure

SeatWise follows Clean Architecture principles with decoupled business logic, centralized state management, typed environment isolation, and scalable API structures:

```
SeatWise/
├── backend/app/
│   ├── algorithms/          # Bipartite 2-coloring, alpha independence, CP-SAT solver
│   ├── database/            # Supabase client, migrations & PostgreSQL DDL
│   ├── routes/              # FastAPI modular REST controllers
│   ├── schemas/             # Pydantic v2 schemas and validation models
│   ├── services/            # Domain services (dashboard, seating, math, timetable)
│   ├── utils/               # Errors, exception handlers, UUID v5 helper
│   ├── auth.py              # JWT authentication & RBAC dependencies
│   ├── config.py            # Centralized Pydantic Settings configuration
│   └── main.py              # Application entrypoint & static SPA mounting
├── frontend/src/
│   ├── config/              # Centralized typed environment & constants
│   ├── context/             # React Context stores (Auth, Notification, Seating)
│   ├── hooks/               # Custom hooks (useDashboardStats, useSeatingPlanner, etc.)
│   ├── components/
│   │   ├── common/          # ErrorBoundary, ToastContainer, StatCard, StatusBadge, Modal
│   │   ├── seating/         # DeskGrid, PolicyConfigurator, SeatingLegend
│   │   ├── layout/          # AppLayout, Navbar, Sidebar
│   │   └── landing/         # Marketing landing sections
│   ├── services/
│   │   ├── api/             # Modular domain API client modules
│   │   └── api.ts           # Unified API client facade
│   ├── types/               # TypeScript interfaces & domain types
│   └── utils/               # Formatting, validation, seating math, export helpers
├── database/migrations/     # 5 SQL migrations (schema, RLS, seeds, RPCs)
├── docs/                    # Architecture, API guide, and quality audit reports
└── tests/                   # 78 automated pytest tests
```

---

## 3. Technology Stack

- **Backend**: Python 3.12 / 3.14, FastAPI, Pydantic v2, Google OR-Tools (CP-SAT), ReportLab (PDF generator), OpenPyXL (Excel parser).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts.
- **Database & Auth**: Supabase PostgreSQL 15 with Row Level Security (RLS) policies, transactional PL/pgSQL RPC routines, and Supabase Auth JWT verification.
- **Deployment**: Vercel Fullstack Serverless + Local port 8080/8000.

---

## 4. Getting Started

### 4.1 Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### 4.2 Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```
Access the application at `http://localhost:5173`.

---

## 5. Automated Test Suite

SeatWise contains 78 comprehensive automated tests covering algorithms, API endpoints, migrations, and frontend integrity:

```bash
py -3.14 -m pytest tests/ -v
```

### Verification Record:
- **32 Mathematical & Algorithm tests** (`tests/algorithms/test_engine.py`):
  - 4x6 grid (10/8, 12/12, 13/11 bound)
  - 3x3 grid (5/4, 6/3 bound)
  - Blocked desks, diagonal constraints, brute-force equivalence
- **37 Backend API & Integration tests** (`tests/backend/test_api.py`):
  - Auth, RBAC role permissions (admin, faculty, student)
  - Math capacity, checkerboard, adjacency, solve endpoints
  - Timetable parser for all 94 batches and 3,500+ sessions
  - Route aliases, save plan payloads, and attendance updates
- **5 Database Migration tests** (`tests/database/test_migrations.py`):
  - 20 required tables and views
  - RLS policies and transactional RPC functions
- **4 Frontend Build & Contract tests** (`tests/frontend/test_build.py`):
  - Asset compilation (`frontend/dist/index.html`, JS/CSS bundles)
  - 13 required navigation pages
  - 39 API client methods contract verification
  - Page contract balance checks

---

## 6. Architectural Documentation

For deep technical insights, refer to:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System decomposition, CP-SAT mathematical model, and state flow.
- [docs/API_GUIDE.md](docs/API_GUIDE.md) — Complete REST API reference, request/response schemas, and error codes.
- [docs/TESTING_AND_QUALITY_REPORT.md](docs/TESTING_AND_QUALITY_REPORT.md) — Complete quality audit and verification records.
