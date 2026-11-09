export type UserRole = 'admin' | 'faculty' | 'exam_staff' | 'student';

export interface UserProfile {
  id: string;
  email: string | null;
  username?: string;
  role: UserRole;
  full_name: string;
  roll_number?: string;
  department?: string;
  avatar_url?: string;
  account_status?: 'active' | 'deactivated' | 'suspended';
  must_change_password?: boolean;
  permissions?: string[];
}

export interface AdminUser {
  id: string;
  email: string | null;
  username?: string;
  role: UserRole;
  full_name: string;
  department?: string;
  assigned_subjects?: string[];
  account_status: 'active' | 'deactivated' | 'suspended';
  must_change_password: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  target_user_id?: string;
  affected_resource?: string;
  details?: any;
  metadata?: any;
  created_at: string;
}

export interface StudentSeatInfo {
  student_name: string;
  roll_number: string;
  examination_id?: string;
  examination_name: string;
  examination_date: string;
  examination_session: string;
  hall_name: string;
  room_code?: string;
  building?: string;
  floor?: string;
  row: number;
  column: number;
  seat_label: string;
  room_dimensions?: {
    rows: number;
    columns: number;
  };
}

export interface StudentExam {
  id: string;
  examination_name: string;
  date: string;
  session: string;
  session_label?: string;
  status: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  department?: string;
  duration_years: number;
  total_semesters: number;
  is_active: boolean;
}

export interface Batch {
  id: string;
  program_id: string;
  program_code?: string;
  semester: number;
  section: string;
  batch_name?: string;
  academic_year: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  roll_number: string;
  full_name: string;
  program_id: string;
  program_code?: string;
  semester: number;
  section: string;
  email?: string;
  phone?: string;
  enrollment_status: 'enrolled' | 'inactive' | 'graduated';
}

export interface Faculty {
  id: string;
  full_name: string;
  email?: string;
  department?: string;
  designation?: string;
  photo_url?: string;
  assigned_subjects?: string[];
  is_active: boolean;
}

export interface RoomSeat {
  id?: string;
  row: number;
  col: number;
  label: string;
  is_usable: boolean;
  is_blocked?: boolean;
}

export interface RoomLayout {
  id?: string;
  room_id: string;
  total_rows: number;
  total_columns: number;
  seats: RoomSeat[];
}

export interface Room {
  id: string;
  room_number: string;
  name?: string;
  building?: string;
  floor?: number;
  room_type: 'classroom' | 'lab' | 'exam_hall';
  rows: number;
  columns: number;
  capacity: number;
  usable_capacity: number;
  blocked_seats_count: number;
  is_exam_approved: boolean;
  is_active: boolean;
  layout?: RoomLayout;
}

export interface TimetableEntry {
  id: string;
  batch_id: string;
  program_code?: string;
  semester?: number;
  section?: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  period_start: number;
  period_end: number;
  slot_type: 'class' | 'lab' | 'lab_continue' | 'activity' | 'lunch' | 'free' | 'sametime';
  subject_label: string;
  subject_code?: string;
  faculty_name?: string;
  room_name?: string;
  is_multi_period: boolean;
}

export interface SeatingPolicy {
  block_same_batch_horizontal: boolean;
  block_same_batch_vertical: boolean;
  block_same_batch_diagonal: boolean;
  allow_empty_seats: boolean;
  allow_mixed_batches: boolean;
  separate_programs: boolean;
}

export interface Examination {
  id: string;
  name: string;
  exam_date: string;
  session: 'morning' | 'afternoon' | 'evening';
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'allocated' | 'published';
  participating_batches?: Batch[];
  approved_halls?: Room[];
}

export interface SeatAssignment {
  seat_id: string;
  room_id: string;
  room_name?: string;
  row: number;
  col: number;
  seat_label: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  batch_id?: string;
  program_code?: string;
  is_absent?: boolean;
}

export interface SeatingPlan {
  id: string;
  name: string;
  kind: 'classroom' | 'examination';
  created_at: string;
  examination_id?: string;
  batch_id?: string;
  room_id?: string;
  status: 'draft' | 'published';
  stats: {
    students_total: number;
    seats_usable: number;
    seats_assigned: number;
    halls_used: number;
    solver_status?: string;
    solver_time_ms?: number;
  };
  validation: {
    is_valid: boolean;
    injective: boolean;
    no_blocked_occupied: boolean;
    adjacency_violations_count: number;
    violations: Array<{ seat_a: string; seat_b: string; reason: string }>;
  };
  assignments: SeatAssignment[];
}
