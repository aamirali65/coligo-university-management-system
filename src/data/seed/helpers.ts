/**
 * Deterministic helpers for seed generation.
 *
 * Seed data must be stable across reloads so that localStorage persistence and
 * the reset-demo-data action are predictable. We use a small seeded PRNG rather
 * than Math.random for that reason.
 */

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRandom(seed: number) {
  const rng = mulberry32(seed);
  return {
    next: rng,
    int: (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)],
    pickMany: <T>(items: readonly T[], count: number): T[] => {
      const pool = [...items];
      const out: T[] = [];
      const n = Math.min(count, pool.length);
      for (let i = 0; i < n; i += 1) {
        const idx = Math.floor(rng() * pool.length);
        out.push(pool.splice(idx, 1)[0]);
      }
      return out;
    },
    chance: (probability: number) => rng() < probability,
    float: (min: number, max: number) => rng() * (max - min) + min,
  };
}

export type Random = ReturnType<typeof makeRandom>;

export const FIRST_NAMES = [
  "Ahmed", "Sara", "Ali", "Hamza", "Fatima", "Bilal", "Nida", "Imran", "Ayesha", "Usman",
  "Zainab", "Omar", "Hira", "Danish", "Maryam", "Faisal", "Rabia", "Kashif", "Sana", "Bilal",
  "Adeel", "Noor", "Tariq", "Iqra", "Junaid", "Amna", "Waleed", "Mahnoor", "Shahid", "Emaan",
  "Rehan", "Anaya", "Salman", "Laiba", "Arsalan", "Zara", "Noman", "Kiran", "Yasir", "Hania",
];

export const LAST_NAMES = [
  "Khan", "Ahmed", "Raza", "Malik", "Noor", "Sheikh", "Farooq", "Qureshi", "Siddiqui", "Iqbal",
  "Hussain", "Baig", "Chaudhry", "Rana", "Butt", "Awan", "Aslam", "Javed", "Mehmood", "Zafar",
];

export const DEPT_IDS = {
  cs: "dept-cs",
  ee: "dept-ee",
  ba: "dept-ba",
  ma: "dept-ma",
  ph: "dept-ph",
} as const;

export const DEMO_IDS = {
  adminUser: "user-admin",
  hodUser: "user-hod-cs",
  teacherUser: "user-teacher-t6",
  studentUser: "user-student-1",
  examUser: "user-exam",
  student: "stu-1",
  teacher: "tch-6",
  hodTeacher: "tch-1",
} as const;

export const CURRENT_SEMESTER_ID = "sem-fall26";
export const CURRENT_SESSION_ID = "sess-2026";
