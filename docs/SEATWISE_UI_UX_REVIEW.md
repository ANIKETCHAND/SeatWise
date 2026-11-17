# SeatWise — UI/UX, Design Consistency & Content Review

**Project:** SeatWise — Smart Examination & Classroom Seating Management System  
**Institution:** Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)  
**Campus Location:** Bangalore, Karnataka, India  
**Date:** November 2026  
**Author:** Team G — Senior Product Designers, UX Engineers & Technical Writers  

---

## 1. Executive Summary & Design System Standards

SeatWise has been refined to embody the aesthetic, clarity, and utilitarian rigor expected of a high-stakes university management platform. The design system is strictly anchored around the official institutional identity of **Jain (Deemed-to-be University) — Faculty of Engineering & Technology (FET)**.

### Design Principles:
1. **Strict Zinc Monochrome Aesthetic:** High contrast, glare-resistant palette utilizing pure blacks (`zinc-950`, `zinc-900`), crisp neutrals (`zinc-100`, `zinc-50`), and defined structural borders (`zinc-200`, `zinc-300`). Legacy primary blues, indigo accents, and colored alerts have been systematically purged.
2. **Institutional Focus:** All multi-university switches, dropdowns, and configurations have been permanently eliminated. The platform is locked exclusively to Jain University FET.
3. **Clarity Over Hyperbole:** Verbose, AI-generated, and overly celebratory language has been replaced with concise, unambiguous administrative terminology.
4. **Information Density & Accessibility:** Dense tabular layouts with high legibility, explicit keyboard shortcuts, ARIA labels on all interactive controls, and print-ready high-contrast seating charts.

---

## 2. Institutional Branding & Locked Configuration

### 2.1 Official Identity
- **Institution:** Jain (Deemed-to-be University)
- **Faculty:** Faculty of Engineering and Technology (FET)
- **Location:** Bangalore, Karnataka, India
- **Visual Assets:** High-resolution official crests deployed across navigation headers, authentication cards, and generated PDF notice boards (`/jain-logo.png`, `/jain-logo-transparent.png`).

### 2.2 Institutional Lockdown Enforcement
In accordance with university governance requirements, SeatWise cannot be switched to other collegiate entities:
- **Settings View (`SettingsPage.tsx`):**
  - "Institution Name" is permanently locked to `Jain (Deemed-to-be University)` (`readOnly disabled`).
  - "Faculty / Department" is locked to `Faculty of Engineering and Technology (FET)`.
  - "Campus Location" is locked to `Bangalore, Karnataka, India`.
  - Prominent "Institutional Lock Active" notification card explains the dedicated nature of the deployment.
- **Academic Programs (`UniversityPage.tsx`):**
  - "Institution" field in "Add Academic Program" modal is permanently read-only.
  - Department dropdown is restricted to FET engineering departments: Computer Science, Information Science, Electronics & Communication, Electrical & Electronics, Mechanical, Civil, and Aerospace Engineering.

---

## 3. Content Cleanup & Terminology Normalization

To eliminate confusing AI jargon and verbose phrasing, systematic copy replacements were executed across all 20 pages:

| Legacy Verbose / AI Phrasing | Professional Normalized Terminology | Affected Components |
|---|---|---|
| *"Initiate examination allocation procedure"* | **Generate Seating** | `ExamSeatingPage`, `Sidebar` |
| *"Comprehensive student information management"* | **Student Records** | `StudentPage`, `Dashboard` |
| *"Advanced examination analytics dashboard"* | **Reports** | `ReportsPage`, `Sidebar` |
| *"Successfully executed the requested operation"* | **Changes saved** | Toast notifications, modals |
| *"No data has been discovered"* | **No records found** | `EmptyState.tsx`, tables |
| *"Centralized institutional administrative command center"* | **Administrator Dashboard** | `DashboardPage.tsx` |
| *"Mode A: Regular Classroom Seating Optimization"* | **Classroom Seating** | `ClassroomSeatingPage.tsx` |
| *"Mode B: University Examination Seating Planner"* | **Seating Planner** | `ExamSeatingPage.tsx` |
| *"Candidate Seat Locator Directory"* | **Student Seat Locator** | `StudentSeatLookupPage.tsx` |
| *"Rigorous Discrete Mathematics & Optimization Specification"* | **Mathematical Engine** | `MathAnalysisPage.tsx` |
| *"Select Your Academic Profile Category"* | **Select Role** | `LoginPage.tsx` |

---

## 4. UI Component & Layout Standardization

### 4.1 Buttons & Action Controls
- **Primary Action Buttons:** `bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs px-3 py-2 rounded-lg transition-colors`.
- **Secondary Actions:** `bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 font-medium text-xs px-3 py-2 rounded-lg`.
- **Destructive Actions:** `bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 text-xs px-3 py-2 rounded-lg` (accompanied by mandatory confirmation dialogs).

### 4.2 Data Tables & Filters
- **Filter Bars:** Consistent layout featuring full-width text search with leading magnifying glass icon, followed by compact dropdown selectors (`Department`, `Program`, `Semester`, `Status`).
- **Table Headers:** `bg-zinc-50 border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 px-4 py-3`.
- **Table Rows:** `hover:bg-zinc-50/70 border-b border-zinc-100 text-xs text-zinc-900 px-4 py-3 transition-colors`.

### 4.3 Seating Canvas & Desk Grid
- **Interactive Desk Elements:**
  - Standard Seat: White desk card with thin zinc border and seat coordinate label (e.g. `A-01`).
  - Allocated Seat: Solid dark or distinct batch indicator badge showing student roll number and batch pill.
  - Blocked Seat: `bg-zinc-100 text-zinc-400 border-dashed border-zinc-300 cursor-not-allowed` with diagonal cross pattern.
- **Seat Drag-and-Swap:** Smooth drag feedback with highlighted valid destination targets. Instantaneous update to local state and atomic commit to Supabase.

---

## 5. Responsive Design & Accessibility Audit

1. **Responsive Viewports:**
   - **Desktop ($> 1280\text{px}$):** Multi-column dashboard layouts, wide 12-column seating grids with sidebar navigation.
   - **Tablet ($768\text{px} - 1280\text{px}$):** Collapsible sidebar, horizontal scrolling for large exam halls ($> 10$ columns) with sticky header controls.
   - **Mobile ($< 768\text{px}$):** Slide-out drawer navigation, single-column dashboard cards, pinch-to-zoom seating locator view.
2. **Keyboard Navigation & Focus Management:**
   - Visible focus rings (`focus:ring-2 focus:ring-zinc-900 focus:outline-hidden`) on all interactive inputs, tabs, and buttons.
   - Modal focus trapping with `Escape` key listeners to dismiss dialogs.
3. **Print Layout Optimization:**
   - Dedicated `@media print` CSS rules in `ClassroomSeatingPage.tsx` and `ReportsPage.tsx`.
   - Sidebars, headers, and buttons automatically hidden during print generation.
   - High-contrast black borders and clear student roll lists formatted specifically for A4 paper notice boards.

---

## 6. UI/UX Review Signoff

The user interface of SeatWise now delivers an uncluttered, modern, and accessible experience tailored for academic administration at Jain University FET. All superfluous jargon has been removed, the monochrome visual standard is 100% compliant, and institutional identity is locked down.
