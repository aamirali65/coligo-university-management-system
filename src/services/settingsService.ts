import type { Settings } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, resetDatabase } from "./mock/store";
import type { Actor } from "./types";

export const settingsService = {
  get(db: ReturnType<typeof getDb>): Settings {
    return db.settings;
  },

  async update(next: Settings, actor: Actor): Promise<Settings> {
    await delay();
    if (!next.universityName.trim()) throw new AppError("required", "University name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.contactEmail)) {
      throw new AppError("invalid_email", "Enter a valid contact email address.");
    }
    if (next.attendanceThreshold < 0 || next.attendanceThreshold > 100) {
      throw new AppError("invalid_threshold", "Attendance threshold must be between 0 and 100.");
    }
    if (!Number.isFinite(next.defaultCapacity) || next.defaultCapacity <= 0) {
      throw new AppError("invalid_capacity", "Default capacity must be a positive number.");
    }
    return commit(
      (draft) => {
        draft.settings = { ...next };
        return draft.settings;
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "Settings", entityId: "settings", description: "Updated application settings." },
    );
  },

  async resetDemoData(actor: Actor): Promise<void> {
    await delay(400);
    resetDatabase();
    commit((draft) => {
      draft.auditLogs = [
        {
          id: "log-reset",
          actorId: actor.id,
          actorName: actor.name,
          action: "reset",
          entityType: "System",
          entityId: "demo-data",
          description: "Reset all demo data to the original seed dataset.",
          timestamp: new Date().toISOString(),
        },
        ...draft.auditLogs,
      ];
    });
  },
};
