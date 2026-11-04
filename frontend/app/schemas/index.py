"""Pydantic request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


# ---------- Auth ----------
class MeResponse(BaseModel):
    user_id: str
    email: str | None
    role: str
    full_name: str


# ---------- University ----------
class ProgramCreate(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class ProgramUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


class BatchCreate(BaseModel):
    program_id: str
    semester: int = Field(ge=1, le=10)
    section: str = Field(min_length=1, max_length=10)


class BatchUpdate(BaseModel):
    section: str | None = None
    class_teacher: str | None = None
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


# ---------- Students ----------
class StudentCreate(BaseModel):
    student_id: str | None = None
    roll_number: str = Field(min_length=1, max_length=40)
    full_name: str = Field(min_length=1, max_length=120)
    program_id: str
    semester: int = Field(ge=1, le=10)
    section: str = Field(min_length=1, max_length=10)
    email: str | None = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    phone: str | None = Field(default=None, max_length=20)


class StudentUpdate(BaseModel):
    roll_number: str | None = Field(default=None, min_length=1, max_length=40)
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    program_id: str | None = None
    semester: int | None = Field(default=None, ge=1, le=10)
    section: str | None = Field(default=None, min_length=1, max_length=10)
    email: str | None = None
    phone: str | None = None
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


# ---------- Faculty ----------
class FacultyCreate(BaseModel):
    faculty_code: str | None = None
    full_name: str = Field(min_length=1, max_length=120)
    email: str | None = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    department: str | None = None
    designation: str | None = None


class FacultyUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    department: str | None = None
    designation: str | None = None
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


# ---------- Rooms ----------
class RoomCreate(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    building: str = ""
    floor: str = ""
    room_type: str = Field(default="classroom", pattern="^(classroom|lab|exam_hall)$")
    rows: int = Field(default=0, ge=0, le=30)
    columns: int = Field(default=0, ge=0, le=30)


class RoomUpdate(BaseModel):
    name: str | None = None
    building: str | None = None
    floor: str | None = None
    room_type: str | None = Field(default=None, pattern="^(classroom|lab|exam_hall)$")
    rows: int | None = Field(default=None, ge=0, le=30)
    columns: int | None = Field(default=None, ge=0, le=30)
    is_exam_approved: bool | None = None
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


class SeatPatch(BaseModel):
    row: int = Field(ge=0, le=29)
    col: int = Field(ge=0, le=29)
    is_blocked: bool


# ---------- Seating ----------
class ClassroomSeatingRequest(BaseModel):
    batch_id: str
    room_id: str
    plan_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    day: str = Field(pattern="^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$")
    period: int = Field(ge=1, le=12)
    enforce_adjacency: bool = False  # classroom mode: OFF by default


class ManualMoveRequest(BaseModel):
    moves: list[dict] = Field(min_length=1)


class SavePlanRequest(BaseModel):
    assignments: list[dict] = Field(min_length=1)
    plan_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class AttendanceRequest(BaseModel):
    student_id: str
    status: str = Field(pattern="^(present|absent)$")


# ---------- Examinations ----------
class ExamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    exam_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    session: str = Field(pattern="^(FN|AN|morning|afternoon)$")
    subject_name: str | None = None
    subject_code: str | None = None

    @field_validator("session")
    @classmethod
    def normalize_session(cls, v: str) -> str:
        if v.lower() == "morning":
            return "FN"
        if v.lower() == "afternoon":
            return "AN"
        return v.upper()


class ExamUpdate(BaseModel):
    name: str | None = None
    exam_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    session: str | None = Field(default=None, pattern="^(FN|AN|morning|afternoon)$")
    status: str | None = Field(default=None, pattern="^(draft|published|archived)$")
    subject_name: str | None = None
    subject_code: str | None = None

    @field_validator("session")
    @classmethod
    def normalize_session(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if v.lower() == "morning":
            return "FN"
        if v.lower() == "afternoon":
            return "AN"
        return v.upper()


class ExamBatchesRequest(BaseModel):
    batch_ids: list[str] = Field(min_length=1)


class ExamHallsRequest(BaseModel):
    room_ids: list[str] = Field(min_length=1)


class ExamSubjectsRequest(BaseModel):
    subjects: list[dict]


class PolicyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = ""
    block_same_batch_horizontal: bool = True
    block_same_batch_vertical: bool = True
    block_same_batch_diagonal: bool = False
    allow_empty_seats: bool = True
    allow_mixed_batch: bool = True
    is_default: bool = False


class ExamSeatingGenerateRequest(BaseModel):
    examination_id: str
    policy_id: str | None = None
    policy_override: dict | None = None
    save: bool = False


# ---------- Mathematics endpoints ----------
class CapacityCheckRequest(BaseModel):
    rows: int = Field(ge=1, le=30)
    columns: int = Field(ge=1, le=30)
    blocked: list[list[int]] = Field(default_factory=list)


class CheckerboardRequest(BaseModel):
    rows: int = Field(ge=1, le=30)
    columns: int = Field(ge=1, le=30)
    class_a: int = Field(ge=0, le=900)
    class_b: int = Field(ge=0, le=900)


class AdjacencyCheckRequest(BaseModel):
    rows: int = Field(ge=1, le=30)
    columns: int = Field(ge=1, le=30)
    blocked: list[list[int]] = Field(default_factory=list)
    include_diagonal: bool = False
    allocation: list[list[str | None]]


class ConstraintSolveRequest(BaseModel):
    rows: int = Field(ge=1, le=12)
    columns: int = Field(ge=1, le=12)
    blocked: list[list[int]] = Field(default_factory=list)
    include_diagonal: bool = False
    groups: dict[str, int] = Field(min_length=1)


# ---------- Reports ----------
class SeatLookupRequest(BaseModel):
    query: str = Field(min_length=2, max_length=80)
