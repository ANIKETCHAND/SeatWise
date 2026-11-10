# SeatWise — UI/UX Content Review & Copy Standardization

**Project:** SeatWise — Smart Examination Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Date:** November 10, 2026  
**Auditor:** Team 6 — UI/UX and Content Cleanup Team  

---

## Content Cleanup Philosophy & Guidelines

The objective of this review is to eliminate artificially verbose, hyperbolic, AI-generated wording and replace it with natural, concise, and professional university administrative language.

### Core Principles Applied:
1. **Direct Action Labels:** Use standard imperative verbs (`Generate Seating`, `Add Student`, `Save Plan`, `Export CSV`) rather than descriptive phrases (`Initiate the allocation process`, `Proceed to add student`).
2. **University Standard Terminology:** Use familiar campus terms (`Curriculum & Batches`, `Halls & Classrooms`, `Seating Planner`, `Timetable`, `Roster`) instead of abstract software terms (`Ecosystem`, `Command Center`, `Portal Infrastructure`).
3. **Removal of Mode Labels:** Replaced internal development names (`Mode A: Regular Classroom Seating`, `Mode B: Examination Seating`) with user-centered titles (`Classroom Seating`, `Seating Planner`).
4. **Single Clear Headings:** Each section features one clear heading and, where needed, an informative single-line subtitle.
5. **Concise Status & Badges:** Avoid redundant explanations inside badges; use clear, short badges (`Active`, `Published`, `Feasible`, `Sample Data`).

---

## Detailed Before & After Inventory

### 1. Navigation Sidebar (`Sidebar.tsx`)

| Location / Item | Before (Verbose / AI Copy) | After (Natural University Language) |
|---|---|---|
| Admin Menu | Institutional Command Center | Dashboard |
| User Directory | Multi-Tenant User Management & Role Provisioning | User Management |
| Add User | Provision Institutional Account | Add User |
| Permissions | Fine-Grained Permissions Matrix | Permissions |
| Audit Trail | Immutable Security & System Audit Logs | Audit Logs |
| Exam Menu | Academic Examinations & Cycle Schedules | Examinations |
| Seating Planner | Mode B: Examination Seating Planner Engine | Seating Planner |
| Hall Visualizer | Campus Architectural Halls & Floor Maps | Halls & Rooms |
| Student Records | Comprehensive Student Information Records | Students |
| Curriculum | Degree Programs, Semesters & Batches | Curriculum |
| Timetable | Master University Timetable & Lab Sessions | Timetable |
| Reports | Official University Examination Reports | Reports |
| Algorithm Spec | Discrete Mathematics & Solver Verification | Algorithm Analysis |
| Settings | System Settings & Optimization Constraints | Settings |

---

### 2. Administrator Dashboard (`DashboardPage.tsx`)

| Component | Before | After |
|---|---|---|
| Hero Banner Title | SeatWise Institutional Command Center | University Examination Operations |
| Hero Subtitle | Real-time overview of examinations, certified halls, timetable sessions, and mathematical seating allocations. | Overview of active examinations, hall capacity, timetable sessions, and seating allocations. |
| Quick Action 1 | Initiate Mode B Examination Seating Allocation | Generate Seating |
| Quick Action 2 | Explore Mathematical Allocation Engine Proofs | Algorithm Analysis |
| System Status | Real-time System Operational Metrics | System Status |

---

### 3. Exam Operations Dashboard (`ExamDashboardPage.tsx`)

| Component | Before | After |
|---|---|---|
| Banner Title | Examination Operations Command Center | Exam Operations Dashboard |
| Banner Subtitle | Centralized coordination for examination scheduling, hall readiness certification, non-adjacency seating plans, and official university reporting. | Examination scheduling, hall readiness, seating plans, and official reports. |
| Action Button 1 | Plan Seating (Mode B) | Seating Planner |
| Action Button 2 | Manage Halls & Floor Maps | Examination Halls |
| Action Button 3 | Official Reports & PDF Locators | Reports |

---

### 4. Faculty Dashboard (`FacultyDashboardPage.tsx`)

| Component | Before | After |
|---|---|---|
| Banner Title | Faculty Academic Seating & Invigilation Portal | Faculty Dashboard |
| Banner Subtitle | Manage your classroom seating configurations, review examination invigilation duties, and inspect course timetables. | Classroom seating plans, invigilation duties, and weekly teaching timetables. |
| Quick Action 1 | Configure Mode A Classroom Seating | Classroom Seating |
| Quick Action 2 | View Master Weekly Timetable | Timetable |

---

### 5. Student Dashboard (`StudentDashboardPage.tsx`)

| Component | Before | After |
|---|---|---|
| Badge | Student Academic & Seating Portal | Student |
| Hero Title | Examination Desk Locator & Schedule | Examination Schedule & Seat Locator |
| Hero Subtitle | Official real-time seat assignments, reporting venues, and upcoming examination timetables for Jain University FET students. | Real-time seat assignments, examination venues, and upcoming schedules. |
| Tab 1 | Live Seat Locator | Find Seat |
| Tab 2 | Today's Assessments | Today's Exams |
| Tab 3 | Upcoming Cycles | Upcoming Exams |
| Tab 4 | Examination History | Exam History |
| Seat Card Header | Official Examination Seat Allocation Certificate | Your Assigned Seat |

---

### 6. User Management Page (`UserManagementPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | User Account Management & Role Provisioning | User Management |
| Subtitle | Multi-tenant RBAC administration for Jain University FET. Manage administrators, exam staff, faculty, and student user accounts. | Manage user accounts, role-based access permissions, and account credentials. |
| Action Button | Provision New Account | Add User |
| Modal Title | User Provisioning & Account Credentials | Account Credentials |
| Tab 2 | Fine-Grained Permissions Matrix | Permissions Matrix |

---

### 7. Examinations Management (`ExamManagementPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | University Examinations Management | Examinations |
| Subtitle | Official examination cycles, schedules, participating degree programs, and hall assignment pipelines. | Schedule and manage examination cycles, sessions, and participating batches. |
| Action Button | Schedule New Examination | Add Examination |
| Batch Selection | Click to toggle participating candidate batches | Select participating academic batches |

---

### 8. Examination Seating Planner (`ExamSeatingPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | Mode B: Automated Examination Seating Planner | Seating Planner |
| Subtitle | Google OR-Tools CP-SAT multi-class constraint optimization engine with strict non-adjacency enforcement. | Generate and manage examination seating plans with automated non-adjacency enforcement. |
| Solve Button | Execute CP-SAT Seating Allocation Solver | Generate Seating |
| Validation Pill | Mathematical Allocation Certified (Zero Edge Conflicts) | Validated |
| Publish Button | Commit & Publish Seating Plan to Student Portals | Publish Plan |

---

### 9. Classroom Seating Page (`ClassroomSeatingPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | Mode A: Regular Classroom Seating Arrangement | Classroom Seating |
| Subtitle | Arrange single-batch daily classroom attendance layouts, teacher podia, and student desk mappings. | Daily classroom seating layouts, student desk assignments, and attendance views. |
| Save Button | Commit & Persist Classroom Plan | Save Plan |

---

### 10. Halls & Rooms Visualizer (`RoomsPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | Classrooms, Examination Halls & Floor Visualizer | Halls & Classrooms |
| Subtitle | JU - School of Engineering and Technology (FET Campus) • Architectural Floor Plans & Venues Management | Campus floor plans, examination hall capacities, and desk layouts. |
| Confidential Badge | CONFIDENTIAL | SECURE |
| Secure Wing Header | Official Examination & Valuation Centers (3rd Floor) | Examination & Valuation Centers |
| Floor Switcher | Select Campus Floor: | Floor: |
| Map Toggle | Schematic Floor Map | Floor Map |
| Save Button | Commit & Persist Layout | Save Layout |

---

### 11. Student Roster (`StudentPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | Student Roster Management | Students |
| Subtitle | Registered student records, program enrollments, and examination candidate directories. | Manage student enrollment records and academic batch allocations. |
| Mode Badge | Sample Data Mode | Sample Data |
| Action Button | Register New Student | Add Student |

---

### 12. Faculty Directory (`FacultyPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | Faculty Management | Faculty |
| Subtitle | Teaching staff, department appointments, and assigned courses catalog (207 faculty members identified). | Directory of academic faculty, departments, and course assignments. |
| Action Button | Register New Faculty Member | Add Faculty |

---

### 13. Curriculum & Batches (`UniversityPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | University Structure Management | Curriculum & Batches |
| Subtitle | Jain University Faculty of Engineering & Technology — 15 Programs & 94 Batches | Academic degree programs, semesters, and class sections. |
| Verification Button | Verify Supabase Seed | Verify Records |
| Program Header | Programs Directory (15) | Programs (15) |

---

### 14. Timetable Management (`TimetablePage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | University Timetable Management | Timetable |
| Subtitle | Weekly 7-period teaching schedule with multi-period laboratory session preservation. | Weekly academic schedule, room allocations, and laboratory session timings. |
| Import Preview | Timetable Import Preview: Pre-flight validation checks completed. Zero silent drops. | Timetable Preview: Validation checks completed. |
| Commit Button | Confirm & Save into Supabase | Save Timetable |

---

### 15. Reports & Exports (`ReportsPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | Official University Examination Reports | Reports |
| Subtitle | Hall-wise seating charts, student seat locators, batch allocations, empty seat audits, and PDF/CSV downloads. | Export seating charts, student seat locators, attendance sheets, and room occupancy reports. |
| Tab 1 | Hall-wise Seating Chart | Hall Seating Chart |
| Tab 2 | Candidate Seat Locator Directory (Student-wise Allocation) | Student Seat Locator |
| Tab 3 | Batch-wise Seat Allocation Report | Batch Allocation |
| Tab 4 | Invigilator Attendance & Answer Booklet Sheet | Attendance Sheet |
| Tab 5 | Empty & Blocked Seat Report | Empty & Blocked Desks |
| Tab 6 | Unallocated Student Report | Unallocated Students |
| Tab 7 | Mathematical Allocation & Set Theory Audit Certificate | Validation Report |

---

### 16. Algorithm Foundations (`MathAnalysisPage.tsx`)

| Component | Before | After |
|---|---|---|
| Badge | Rigorous Discrete Mathematics & Optimization Specification | Mathematical Allocation Engine |
| Page Header | Mathematical Allocation Engine Foundations | Algorithm Analysis & Validation |
| Subtitle | SeatWise mathematically guarantees seating allocations using Set Theory injectivity... | Seating constraints validated via Set Theory injectivity, Pigeonhole Principle, and CP-SAT. |
| Preset Label | Run Master Spec Test Cases: | Presets: |
| Simulator Header | Interactive Layout & Adjacency Simulator | Adjacency Simulator |

---

### 17. Authentication & Login (`LoginPage.tsx`)

| Component | Before | After |
|---|---|---|
| Subtitle | Smart examination seating, hall allocation, and student desk lookup portal. | Smart examination seating, hall allocation, and student desk lookup. |
| Step 1 Header | Select Your Account Type | Select Role |
| Step 1 Instruction | Choose your university role to proceed to the secure credential verification form. | Choose your university role to sign in. |
| Step 2 Badge | Portal Sign In | Sign In |
| Step 2 Title | {Role} Login | {Role} |

---

### 18. Audit Logs (`AuditLogsPage.tsx`)

| Component | Before | After |
|---|---|---|
| Badge | Immutable Audit Trail | Security Audit |
| Page Header | System & Security Audit Logs | Audit Logs |
| Subtitle | Complete chronological audit trail of authentication events, user provisioning... | Chronological log of authentication, user provisioning, password resets, and permission changes. |
| Action Button | Refresh Records | Refresh |

---

### 19. Historical Seating Plans (`HistoryPage.tsx`)

| Component | Before | After |
|---|---|---|
| Page Header | Historical Seating Plans & Archive | Seating History |
| Subtitle | Official repository of published, draft, and archived seating arrangements with solver metrics. | Archive of published, draft, and completed examination seating plans. |
