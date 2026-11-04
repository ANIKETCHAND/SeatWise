export interface InitialProgramDef {
  code: string;
  name: string;
  department: string;
  batches: Array<{ semester: number; section: string }>;
}

export const INITIAL_PROGRAMS: InitialProgramDef[] = [
  {
    code: 'AI-DevOPS',
    name: 'B.Tech in Artificial Intelligence & DevOps',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
    ],
  },
  {
    code: 'AIDE',
    name: 'B.Tech in AI & Data Engineering',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 3, section: 'B' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
  {
    code: 'AIML',
    name: 'B.Tech in AI & Machine Learning',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' }, { semester: 1, section: 'B' }, { semester: 1, section: 'C' },
      { semester: 1, section: 'D' }, { semester: 1, section: 'E' }, { semester: 1, section: 'F' }, { semester: 1, section: 'G' },
      { semester: 3, section: 'A' }, { semester: 3, section: 'B' }, { semester: 3, section: 'C' },
      { semester: 3, section: 'D' }, { semester: 3, section: 'E' },
      { semester: 5, section: 'A' }, { semester: 5, section: 'B' }, { semester: 5, section: 'C' }, { semester: 5, section: 'D' },
      { semester: 7, section: 'A' }, { semester: 7, section: 'B' }, { semester: 7, section: 'C' }, { semester: 7, section: 'D' },
    ],
  },
  {
    code: 'Blockchain',
    name: 'B.Tech in Blockchain Technology',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
    ],
  },
  {
    code: 'CPS',
    name: 'B.Tech in Cyber Physical Systems',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
    ],
  },
  {
    code: 'CSBS',
    name: 'B.Tech in Computer Science & Business Systems',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
  {
    code: 'CSE-AI',
    name: 'B.Tech in CSE (Artificial Intelligence)',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
  {
    code: 'CSE-GEN',
    name: 'B.Tech in Computer Science & Engineering (Core)',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' }, { semester: 1, section: 'B' }, { semester: 1, section: 'C' },
      { semester: 1, section: 'D' }, { semester: 1, section: 'E' }, { semester: 1, section: 'F' },
      { semester: 3, section: 'A' }, { semester: 3, section: 'B' }, { semester: 3, section: 'C' },
      { semester: 3, section: 'D' }, { semester: 3, section: 'E' }, { semester: 3, section: 'F' }, { semester: 3, section: 'G' },
      { semester: 5, section: 'A' }, { semester: 5, section: 'B' }, { semester: 5, section: 'C' },
      { semester: 5, section: 'D' }, { semester: 5, section: 'E' },
      { semester: 7, section: 'A' }, { semester: 7, section: 'B' }, { semester: 7, section: 'C' },
      { semester: 7, section: 'D' }, { semester: 7, section: 'E' },
    ],
  },
  {
    code: 'CTIS',
    name: 'B.Tech in Cloud Technology & Info Security',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
  {
    code: 'CTMA',
    name: 'B.Tech in Cloud Tech & Mobile Apps',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
  {
    code: 'CyberSecurity',
    name: 'B.Tech in Cyber Security',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
  {
    code: 'DS',
    name: 'B.Tech in Data Science',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
  {
    code: 'IOT',
    name: 'B.Tech in Internet of Things',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
  {
    code: 'MTech',
    name: 'M.Tech in Computer Science',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' }, { semester: 1, section: 'B' }, { semester: 1, section: 'C' },
      { semester: 3, section: 'A' }, { semester: 3, section: 'B' }, { semester: 3, section: 'C' },
    ],
  },
  {
    code: 'SE',
    name: 'B.Tech in Software Engineering',
    department: 'Computer Science and Engineering',
    batches: [
      { semester: 1, section: 'A' },
      { semester: 3, section: 'A' },
      { semester: 5, section: 'A' },
      { semester: 7, section: 'A' },
    ],
  },
];

export const PERIOD_TIMINGS = [
  { period: 'P1', time: '8:45 AM – 9:45 AM' },
  { period: 'P2', time: '9:45 AM – 10:45 AM' },
  { period: 'P3', time: '11:00 AM – 12:00 PM' },
  { period: 'P4', time: '12:00 PM – 1:00 PM' },
  { period: 'P5', time: '1:00 PM – 1:50 PM' },
  { period: 'P6', time: '1:50 PM – 2:50 PM' },
  { period: 'P7', time: '2:50 PM – 3:50 PM' },
];

export const TOTAL_PROGRAMS_COUNT = INITIAL_PROGRAMS.length; // 15
export const TOTAL_BATCHES_COUNT = INITIAL_PROGRAMS.reduce(
  (acc, p) => acc + p.batches.length,
  0
); // 94

// Architectural Campus Floor Plans & Rooms Data Model
export * from './campusFloorData';

