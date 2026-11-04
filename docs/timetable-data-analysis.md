# Timetable Data Source Analysis

Source file: `project_data/jain_timetable_data.xlsx` (supplied workbook, snapshot dated 2026-09-14 21:28 per its Read Me sheet).

This document records the actual structure observed in the file. No timetable entries are invented; the importer is built strictly around what the file contains.

## Workbook sheets

| Sheet | Rows × Cols | Purpose |
|---|---|---|
| Read Me | 9 × 2 | Dataset provenance and slot-type definitions |
| Batch Index | 94 × 10 | One row per program/semester/section batch |
| Timetable All | 3948 data rows × 10 | Every batch × day × period slot |
| Classes Only | 1923 × 10 | Class/lab sessions only |
| Free Slots | 136 × 10 | Explicitly free periods |
| Subjects | 173 × 7 | Subject catalogue with codes |
| Subject Offerings | 738 × 8 | Subjects mapped to batch + faculty + LTPE |
| Faculty | 207 × 3 | Faculty names + assignment summaries (JSON) |
| Rooms | 98 × 4 | Room names, type (Class/Lab), seating capacity |
| Room Timetable | 4158 × 7 | Room-centric view of all slots |
| Class Teachers | 88 × 4 | Batch → class teacher |
| Programs & Sections | 54 × 3 | Program/semester/section index |
| Period Definitions | 7 × 6 | Period numbers, labels, times, start/end minutes |

## Verified counts (from the file itself)

- **15 programs**, **94 batches** — matches the master specification exactly.
- Slot types in Timetable All: `class` 1425, `lab` 379, `lab-continue` 379, `lunch` 541, `activity` 969, `sametime` 119, `free` 136.
- Periods P1–P7 with times exactly as specified in the master prompt (8:45–9:45 … 2:50–3:50).
- Days: Mon–Sat.
- Rooms: 66 Class rooms, 32 Labs; seating capacity present for 98 rooms (range 30–72).
- Faculty: 207 rows; names include title and designation, e.g. `Dr. A Vijayalakshmi - Assistant Professor`.

## Slot text grammar (observed, not guessed)

Scheduled Text formats found in `Timetable All` / `Classes Only`:

| Pattern | Count | Example |
|---|---|---|
| `SUBJ(CODE) in ROOM` | 1425 | `MAC(C18A) in 304-Room` |
| `SUBJ(CODE)(L) in ROOM` | 379 | `EL(C27A)(L) in 404 Epst. Lab AERO` |
| `SUBJ(CODE) in ROOM` (sametime) | 119 | `RM(C8A) in 114C [AC] Room` |
| `Activity` (no room) | 924 | `Library`, `Project`, `Club Activities`, `Mentoring`, `TDPCL`… |
| `Activity in ROOM` | 45 | `Experiential Learning in 304` |
| `Lunch` | 541 | fixed text `Lunch` |
| *(blank)* | 379 | `lab-continue` rows (continuation of a multi-period lab) |

Notes:
- `(L)` suffix marks a lab session; multi-period labs span 2 periods (`Span Periods` = 2) with the second row typed `lab-continue` and blank text. The importer must merge these into one session.
- `sametime` slots are sessions running for multiple batches simultaneously (e.g. online Research Methodology); they still carry a room and a faculty subject code.
- A blank cell means *continuation*, not free (per the Read Me sheet).
- `free` is only explicit in the Free Slots sheet / slot type.
- Subject codes are per-program section codes like `C18A`, `M7` — mapped to names via the Subjects sheet (e.g. `C18A` → Matrix Algebra and Calculus; codes may be comma-separated lists like `E11, N8, R8, S7` all = Advanced Machine Learning).

## Batch Index columns

`Program, Semester, Section, Batch Title, Class Teacher, Days, Periods, Slots, Class/Lab Slots, Explicit Free Slots`

## Room Timetable columns

`Room, Day, Period, Time, Slot Type, Scheduled Text, Span Periods`

Room Timetable's Scheduled Text embeds the batch: `OOPJ(P3A)(L) (CSBS-S3-A)` — useful for room-conflict detection.

## Decisions for the importer

1. Parse only from the file's actual columns; never fabricate subjects/faculty/rooms.
2. Merge `lab` + following `lab-continue` rows into a single multi-period session (span recorded).
3. Map subject abbreviations to full names using the Subjects sheet where a match exists; otherwise keep the abbreviation as label (recorded as "unresolved" for review, never dropped silently).
4. Faculty names are stored as-is (designation included) and linked to Subject Offerings.
5. Lunch/activity/free rows are stored as non-teaching slots so weekly views are complete; they are not treated as classroom sessions.
6. Rooms from the teaching timetable are imported as room *catalogue* data (type + capacity), but are NOT auto-approved as examination halls — exam halls are configured separately per the master spec.
