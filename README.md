# SeatWise
## Smart Classroom & Examination Seating Management System for Jain University

SeatWise is an enterprise-grade full-stack web application designed for **Jain University** to mathematically generate, validate, and manage conflict-free seating arrangements for both **daily academic classroom sessions** and **large-scale university examinations**.

---

## 1. Key System Capabilities

### Mode A: Regular Classroom Seating
- **Dynamic Timetable Linking**: Resolves real subjects, faculty, and room allocations across Monday–Saturday for 7 daily periods (P1–P7).
- **Classroom Non-Adjacency Policy**: Same-batch adjacency is allowed by default for regular teaching, but can be configured.
- **Interactive Drag-and-Swap Seating Grid**: Visual classroom board, instructor podium, desk states, and live student swaps.
- **Attendance Marking**: Real-time present/absent toggling directly on the visual desk grid.
- **Exporting**: Instant PDF Classroom Seating Charts and CSV rosters.

### Mode B: Examination Seating
- **Multi-Cohort & Multi-Hall Scaling**: Simultaneously distributes students across multiple approved examination halls.
- **Strict Non-Adjacency Constraints**: Prevents same-batch students from sitting horizontally, vertically, or optionally diagonally adjacent.
- **Mathematical Optimization Engine**: Uses **Google OR-Tools CP-SAT** constraint programming with exact bipartite checkerboard solvers.
- **Student Seat Locator**: Instant roll-number search for examinees to locate their hall, row, column, and desk number.
- **Notice Board Generator**: Printable PDF notices formatted for university bulletin boards and invigilator attendance sheets.

### Mathematical Analysis Engine
- **Dedicated Interactive Mathematics Page**: Visualizes the theoretical principles powering SeatWise:
  1. Set Theory & Injective Mapping ($f: S \to T$)
  2. Dirichlet's Pigeonhole Principle ($|S| \le |T|$)
  3. Graph Adjacency Modeling ($G = (V, E)$)
  4. Bipartite Checkerboard 2-Coloring ($\text{color}(r, c) = (r + c) \bmod 2$)
  5. Maximum Independent Set Bound ($\alpha(G) = \lceil R \times C / 2 \rceil$) & Kőnig's theorem for layouts with blocked desks
  6. Constraint Satisfaction Problem (CSP) formulation via CP-SAT

---

## 2. Technology Stack

- **Backend**: Python 3.11+ / 3.14, FastAPI, Pydantic v2, Google OR-Tools (CP-SAT 9.15), ReportLab (PDF generator), OpenPyXL (Excel parser).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts (dynamic university analytics).
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) policies, transactional PL/pgSQL RPC routines, and Supabase Auth JWT verification.

---

## 3. Initial University Structure & Provenance

Generated directly from `project_data/jain_timetable_data.xlsx` (snapshot 2026-09-14):
- **15 Programs**: AI-DevOPS, AIDE, AIML, Blockchain, CPS, CSBS, CSE-AI, CSE-GEN, CTIS, CTMA, CyberSecurity, DS, IOT, MTech, SE.
- **94 Academic Batches**: Covers Semesters 1, 3, 5, and 7 across sections A through G with assigned class teachers.
- **7 Daily Periods**:
  - P1: 8:45 AM – 9:45 AM
  - P2: 9:45 AM – 10:45 AM
  - P3: 11:00 AM – 12:00 PM
  - P4: 12:00 PM – 1:00 PM
  - P5: 1:00 PM – 1:50 PM
  - P6: 1:50 PM – 2:50 PM
  - P7: 2:50 PM – 3:50 PM

---

## 4. Getting Started

### Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
# Copy environment template
cp ../.env.example .env
# Run FastAPI server
uvicorn app.main:app --reload --port 8000
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```
Access the application at `http://localhost:5173`.

---

## 5. Automated Test Suite & Quality Report

SeatWise comes with 53 comprehensive automated test suites covering algorithm bounds, edge cases, API endpoints, timetable ingestion, and asset compilation:

```bash
python -m pytest tests/ -v
```

All 53 test suites pass (100% pass rate in ~2.5s):
- **32 Mathematical & Algorithm unit tests** (4x6 10/8, 12/12, 13/11 bound, 3x3 5/4, 6/3 bound, 2x2, 1x1, blocked desks, diagonal restrictions, brute-force comparisons)
- **19 Backend API & Integration tests** (FastAPI health endpoints, RBAC, math capacity/checkerboard/solve endpoints, Excel timetable parser on 94 batches, error handling 401/403/422/503, route aliases)
- **2 Frontend build and asset verification tests** (production bundle compilation, 13 core navigation pages)

For the complete Section 21 specification report, including database verification, mathematical validation proofs, security test results, and deployment readiness, see:
- [docs/TESTING_AND_QUALITY_REPORT.md](docs/TESTING_AND_QUALITY_REPORT.md)

