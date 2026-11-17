# SeatWise — Comprehensive Cybersecurity & RBAC Security Audit

**Project:** SeatWise — Smart Examination & Classroom Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Campus Location:** Bangalore, Karnataka, India  
**Date:** November 2026  
**Author:** Team C — Application Security Architects & Penetration Testers  
**Classification:** Confidential Security Evaluation  

---

## 1. Executive Security Summary

A rigorous security audit was conducted across the SeatWise application codebase, API layer, authentication flows, and PostgreSQL database instance. The evaluation focused on zero-trust design, role-based access control (RBAC), Row-Level Security (RLS), Insecure Direct Object References (IDOR), privilege escalation prevention, and credential management.

### Key Audit Highlights:
- **Zero-Trust Role Resolution:** Client-supplied role claims are completely disregarded. Roles are derived strictly from cryptographically verified Supabase JWTs validated against the server-side `profiles` table.
- **Strict Role Segregation:** Four discrete user roles are enforced at both the API gateway and database levels:
  1. `admin` (Administrator)
  2. `exam_staff` (Examination Staff)
  3. `faculty` (Academic Faculty)
  4. `student` (Student / Examinee)
- **IDOR Elimination:** Students are restricted strictly to their own desk locators and schedules. Staff access to student lookups requires explicit parameters and does not synthesize fabricated records.
- **Service-Role Key Protection:** The Supabase `service_role` key is strictly kept in secure backend environment variables and never bundled or exposed in frontend JavaScript bundles.

---

## 2. Authentication & JWT Validation Architecture

### 2.1 Token Verification Workflow
SeatWise employs a multi-tiered JWT validation pipeline in `app/auth.py`:
1. **Asymmetric JWKS Verification:** When connected to live Supabase Auth, incoming Bearer tokens are validated against Supabase's published JSON Web Key Set (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`) using `PyJWKClient` with RS256/ES256 signature verification.
2. **Symmetric Secret Fallback:** In staging environments with an explicit `SUPABASE_JWT_SECRET`, tokens are verified via HS256 HMAC signature validation.
3. **Audience & Issuer Enforcement:** Valid tokens must match the project's Supabase issuer URL and audience `authenticated`.
4. **Revocation & Expiration:** Expired tokens (`exp` timestamp in the past) and malformed signatures are immediately rejected with `HTTP 401 Unauthorized`.

### 2.2 Password Policy & Mandatory First-Login Rotation
- Passwords created by administrators during user provisioning must satisfy a strict complexity policy: minimum 12 characters, including uppercase, lowercase, numbers, and special symbols.
- The `must_change_password` boolean flag forces newly provisioned users to rotate their password on initial login via `POST /api/auth/change-password` before dashboard access is granted.

---

## 3. Role-Based Access Control (RBAC) Matrix & Enforcements

| Feature / Endpoint | Administrator (`admin`) | Exam Staff (`exam_staff`) | Faculty (`faculty`) | Student (`student`) |
|---|---|---|---|---|
| `/dashboard` (Executive Overview) | **ALLOW (200)** | Redirect (`/exam-dashboard`) | Redirect (`/faculty-dashboard`) | Redirect (`/student-dashboard`) |
| `/admin/users` (User Management) | **ALLOW (200)** | **DENY (403)** | **DENY (403)** | **DENY (403)** |
| `/admin/audit-logs` (Audit Trail) | **ALLOW (200)** | **DENY (403)** | **DENY (403)** | **DENY (403)** |
| `/university` (Program/Batch Tree) | **ALLOW (200)** | **DENY (403)** | **DENY (403)** | **DENY (403)** |
| `/settings` (System Configuration) | **ALLOW (200)** | **DENY (403)** | **DENY (403)** | **DENY (403)** |
| `/examinations` (Create/Edit Exam) | **ALLOW (200)** | **ALLOW (200)** | **DENY (403)** | **DENY (403)** |
| `/seating-planner` (Generate Seating)| **ALLOW (200)** | **ALLOW (200)** | **DENY (403)** | **DENY (403)** |
| `/classroom-seating` (Lecture Mode)| **ALLOW (200)** | **DENY (403)** | **ALLOW (200)** | **DENY (403)** |
| `/reports` (Hall Charts & Locator) | **ALLOW (200)** | **ALLOW (200)** | View-Only (200) | **DENY (403)** |
| `/student-dashboard` (Desk Lookup) | **ALLOW (200)** | **ALLOW (200)** | View-Only (200) | **ALLOW (Own Record Only)** |

---

## 4. Verification of Critical Security Rules

### Rule 1: Never Trust Roles Supplied by Frontend
- **Verification:** Verified via `test_role_enforcement_student_denied_admin_endpoint` and dependency injection in `app/auth.py`. Even if a client crafts a request header claiming `"role": "admin"`, the server reads the cryptographically signed JWT claim and queries the database `profiles` table. Attempting administrative actions without an admin token yields `HTTP 403 Forbidden: Administrator privileges required`.
- **Status:** **PASS**

### Rule 2: Never Use localStorage as Proof of Authorization
- **Verification:** Frontend `localStorage` holds only cached presentation hints (such as UI theme). All data fetching requires an `Authorization: Bearer <token>` header verified by the server on every request.
- **Status:** **PASS**

### Rule 3: Never Allow Users to Change Their Own Roles
- **Verification:** Role modification is strictly isolated to `PUT /api/admin/users/{user_id}/status` and user provisioning endpoints guarded by `require_admin`. A user attempting to update their own profile cannot alter the `role` column; the database trigger `prevent_self_role_escalation` cancels unauthorized updates.
- **Status:** **PASS**

### Rule 4: Never Expose Supabase Service-Role Keys
- **Verification:** Automated regex scanning across `frontend/src` and `frontend/dist` confirmed zero occurrences of `SUPABASE_SERVICE_ROLE_KEY` or service-role JWTs. Only the public anon key (`SUPABASE_ANON_KEY`) is bundled into client assets.
- **Status:** **PASS**

### Rule 5: Prevent Insecure Direct Object References (IDOR)
- **Verification:**
  - Tested in `tests/backend/test_auth_rbac.py::test_student_cannot_lookup_another_students_seat`.
  - When an authenticated student calls `/api/student/seat-lookup`, the endpoint ignores any arbitrary `?roll_number=` query parameter and enforces lookup matching the student's authenticated `auth_user_id`.
  - Calling administrative lookup endpoints (`/api/reports/locator-data`, `/api/reports/exam/{exam_id}/csv`) with student credentials yields `HTTP 403 Forbidden`.
- **Status:** **PASS**

### Rule 6: Demotion and Account Deletion Safeguards
- **Verification:** Tested in `tests/backend/test_auth_rbac.py::test_admin_safeguard_prevents_demoting_last_active_admin` and `test_admin_safeguard_prevents_removing_last_active_admin`. The system dynamically checks the count of active administrators before allowing role modification or deactivation. Attempting to deactivate or demote the sole active administrator is blocked with `HTTP 400 Bad Request`.
- **Status:** **PASS**

### Rule 7: Rate Limiting & Denial of Service Protection
- **Verification:** Tested in `tests/backend/test_auth_rbac.py::test_rate_limiting_enforcement_returns_429`. High-frequency bursts against authentication and optimization routes trigger the sliding-window limiter, returning `HTTP 429 Too Many Requests`.
- **Status:** **PASS**

---

## 5. Security Audit Findings & Defect Remediations

### Remediation of BUG-001 (High): Staff Seat Lookup Failure
- *Defect:* Staff accounts querying `/api/student/seat-lookup?roll_number=...` encountered an internal server error because the code attempted to link the staff user ID to a student profile.
- *Fix:* Added conditional role branch. Students resolve their own record; staff and administrators query the student directory directly by roll number.
- *Status:* **VERIFIED & FIXED**

### Remediation of BUG-004 (Low): Missing Parameter Error
- *Defect:* Staff calling lookup without `roll_number` parameter synthesized a mock record instead of validating input.
- *Fix:* Explicit check raising `HTTP 400 Bad Request: roll_number query parameter required for staff lookup`.
- *Status:* **VERIFIED & FIXED**

### Remediation of BUG-008 (High): False Seating Fabrication on Non-Existent Roll Numbers
- *Defect:* Querying non-existent roll numbers in demo mode fabricated a confirmed desk allocation.
- *Fix:* Reordered execution checks to return empty allocations (`allocations: []`) when the roll number is not registered.
- *Status:* **VERIFIED & FIXED**

---

## 6. Security Conclusion & Certification

SeatWise demonstrates robust, defense-in-depth security. Role boundaries are strictly enforced at the API and database levels, zero-trust token validation prevents token tampering or privilege escalation, and student records are securely shielded from IDOR vulnerabilities.
