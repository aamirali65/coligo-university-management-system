import type { Settings } from "@/types";
import { DEFAULT_GRADING_SCALE } from "@/lib/constants";

export const settings: Settings = {
  universityName: "Coligo University",
  contactEmail: "registrar@coligo.demo",
  contactPhone: "+92 21 111 000 111",
  address: "12 University Avenue, Academic City",
  gradingScale: DEFAULT_GRADING_SCALE,
  attendanceThreshold: 75,
  defaultCapacity: 50,
  dateFormat: "MMM d, yyyy",
  theme: "light",
};
