/**
 * Application Constants.
 * Centralized constant declarations to prevent magic strings and duplicate code.
 */

export const APP_CONFIG = {
  APP_NAME: 'SeatWise',
  APP_FULL_TITLE: 'SeatWise — Smart Examination Seating Management System',
  INSTITUTION_NAME: 'Jain (Deemed-to-be University)',
  INSTITUTION_SUBTITLE: 'Faculty of Engineering and Technology (FET) Seating Portal',
  DEFAULT_SOLVER_TIME_LIMIT_SECONDS: 20,
  DEFAULT_PAGE_SIZE: 25,
  SESSION_STORAGE_USER_KEY: 'seatwise_user',
  DEFAULT_MAX_COLUMNS: 12,
  DEFAULT_MAX_ROWS: 10,
} as const;

export const EXAM_SESSIONS = [
  { value: 'morning', label: 'Morning (FN: 09:30 AM - 12:30 PM)' },
  { value: 'afternoon', label: 'Afternoon (AN: 01:30 PM - 04:30 PM)' },
  { value: 'evening', label: 'Evening (EV: 05:00 PM - 08:00 PM)' },
] as const;

export const DAYS_OF_WEEK = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  EXAM_STAFF: 'exam_staff',
  STUDENT: 'student',
} as const;
