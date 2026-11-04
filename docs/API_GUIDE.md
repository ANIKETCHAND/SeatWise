# SeatWise REST API Specification & Integration Guide

## 1. Overview & Authentication

SeatWise provides a versioned RESTful API under the prefix `/api`.

### 1.1 Authentication & Authorization
All secured endpoints require a standard Bearer token header:
```http
Authorization: Bearer <supabase_access_token>
```

#### Roles:
- `admin`: Full management rights (university, faculty, exams, rooms, policies).
- `faculty`: View timetables, students, and generate Mode A classroom seating plans.
- `exam_staff`: Manage exam halls, allocate candidates, publish seating plans, record attendance.
- `student`: Read-only access to own profile, published seating locations, and timetable.

#### Development / Demo Tokens:
For testing and development in offline or mock mode:
- `Bearer demo-token-admin` (Admin role)
- `Bearer demo-token-faculty` (Faculty role)
- `Bearer demo-token-exam_staff` (Exam staff role)
- `Bearer demo-token-student` (Student role)

---

## 2. API Endpoints

### 2.1 Diagnostics & Authentication
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/health` | Public | System health and database connection status |
| `GET` | `/api/health` | Public | Alias health endpoint |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and role |
| `GET` | `/api/auth/status` | Authenticated | Validate token expiration and permissions |

### 2.2 University & Academic Batches
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/university/programs` | Authenticated | List all registered degree programs |
| `POST` | `/api/university/programs` | Admin | Create a new degree program |
| `GET` | `/api/university/programs/tree`| Authenticated | Hierarchical tree of programs and child batches |
| `GET` | `/api/university/batches` | Authenticated | Filter batches by `program_id` and `semester` |
| `POST` | `/api/university/batches` | Admin | Create a new student batch |

### 2.3 Timetable Ingestion & Search
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/timetable` | Authenticated | Query timetable entries by program, semester, section, day |
| `POST` | `/api/timetable/import/preview` | Admin | Parse uploaded Excel workbook and return summary stats |
| `POST` | `/api/timetable/import/commit` | Admin | Commit verified timetable records into Supabase PostgreSQL |
| `GET` | `/api/timetable/search?q={query}` | Authenticated | Full-text search across subject codes and faculty |

### 2.4 Students & Faculty
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/students` | Authenticated | List enrolled students with optional batch filtering |
| `POST` | `/api/students` | Admin | Register a single student record |
| `POST` | `/api/students/import` | Admin | Bulk import students array |
| `GET` | `/api/faculty` | Authenticated | List faculty members by department |
| `POST` | `/api/faculty` | Admin | Add faculty profile |

### 2.5 Rooms & Exam Halls
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/rooms` | Authenticated | List all rooms and lecture theaters |
| `POST` | `/api/rooms` | Admin | Create a room record |
| `GET` | `/api/rooms/halls/approved` | Authenticated | List halls certified for formal examination seating |
| `PUT` | `/api/rooms/{room_id}/layout` | Admin | Update grid rows, columns, and defective blocked seats |

### 2.6 Mode A: Classroom Seating
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/seating/classroom/generate` | Faculty, Admin | Generate optimized single-batch classroom plan |
| `POST` | `/api/seating/classroom/save` | Faculty, Admin | Persist classroom plan to database |
| `GET` | `/api/seating/classroom/{plan_id}` | Authenticated | Retrieve classroom plan details and matrix |
| `POST` | `/api/seating/classroom/{plan_id}/attendance` | Faculty | Update student absence list |

### 2.7 Mode B: Examination Seating
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/examinations` (or `/api/exams`) | Authenticated | List scheduled examinations |
| `POST` | `/api/examinations` | Exam Staff, Admin | Create examination event |
| `GET` | `/api/examinations/{id}` | Authenticated | Get examination details |
| `PATCH` | `/api/examinations/{id}` | Exam Staff, Admin | Update exam parameters |
| `DELETE` | `/api/examinations/{id}` | Admin | Delete examination session |
| `POST` | `/api/examinations/{id}/archive` | Admin | Archive past exam |
| `PUT` | `/api/examinations/{id}/batches` | Exam Staff, Admin | Associate participating batches |
| `PUT` | `/api/examinations/{id}/halls` | Exam Staff, Admin | Allocate exam halls |
| `PUT` | `/api/examinations/{id}/subjects` | Exam Staff, Admin | Configure subject papers |
| `POST` | `/api/seating/examination/generate` | Exam Staff, Admin | Run optimization solver for multi-hall allocation |
| `POST` | `/api/seating/examination/validate` | Authenticated | Audit seating allocation against policy rules |
| `POST` | `/api/seating/examination/save` | Exam Staff, Admin | Save finalized plan |
| `GET` | `/api/seating/examination/{plan_id}` | Authenticated | Fetch seating plan matrix and stats |
| `POST` | `/api/seating/examination/{plan_id}/publish` | Exam Staff, Admin | Publish plan to students |
| `POST` | `/api/seating/examination/{plan_id}/moves` | Exam Staff, Admin | Execute manual desk swap / move |
| `POST` | `/api/seating/examination/{plan_id}/attendance` | Exam Staff | Mark candidate present / absent |
| `GET` | `/api/seating/examination/lookup?q={roll}` | Student, Public | Student seat lookup query |

### 2.8 Mathematics Analysis
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/math/capacity` | Authenticated | Calculate total, usable, and independence bound alpha(G) |
| `POST` | `/api/math/checkerboard` | Authenticated | Calculate bipartite 2-coloring feasibility |
| `POST` | `/api/math/adjacency` | Authenticated | Detect horizontal, vertical, and diagonal violations |
| `POST` | `/api/math/solve` | Authenticated | Run interactive CP-SAT solver on arbitrary grid |

### 2.9 Reports & Export
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/seating/plans` | Authenticated | List all generated plans with filter by kind |
| `GET` | `/api/reports/exam/{id}/locator` | Authenticated | JSON locator guide for door postings |
| `GET` | `/api/reports/plan/{id}/csv` | Authenticated | Download CSV file of seating plan |
| `GET` | `/api/reports/plan/{id}/pdf` | Authenticated | Download printable PDF seating chart |
| `GET` | `/api/reports/exam/{id}/locator/pdf` | Authenticated | Download door locator PDF notices |
| `GET` | `/api/reports/exam/{id}/csv` | Authenticated | Download comprehensive exam attendance roster |

---

## 3. Standard Error Response Format

Errors return consistent HTTP status codes and structured JSON bodies:

```json
{
  "error": {
    "code": "invalid_dimensions",
    "message": "Rows and columns must be integers between 1 and 30.",
    "details": {
      "field": "rows",
      "value": -4
    }
  }
}
```

Standard Status Codes:
- `400 Bad Request`: Validation failure or illogical parameters.
- `401 Unauthorized`: Missing or malformed Bearer authorization token.
- `403 Forbidden`: Role does not have sufficient privileges.
- `404 Not Found`: Resource ID not found.
- `409 Conflict`: Business rule collision (e.g. seat already occupied or hall capacity exceeded).
- `422 Unprocessable Entity`: Schema payload validation error.
- `503 Service Unavailable`: Database unconfigured or unreachable.
