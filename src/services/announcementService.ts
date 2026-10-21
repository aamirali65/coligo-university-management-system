import type { Announcement, ID, ListParams, Paginated, User } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface AnnouncementInput {
  title: string;
  content: string;
  audience: Announcement["audience"];
  departmentId: ID | null;
  expiresAt: string | null;
  status: Announcement["status"];
}

export const announcementService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Announcement> {
    const { search, audience, status, departmentId } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.announcements.filter((a) => {
      if (!matches(q, [a.title, a.content])) return false;
      if (audience && a.audience !== audience) return false;
      if (status && a.status !== status) return false;
      if (departmentId && a.departmentId !== departmentId) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  byId(db: ReturnType<typeof getDb>, id: ID): Announcement | undefined {
    return db.announcements.find((a) => a.id === id);
  },

  /** Announcements visible to a user, scoped by role, audience and department. */
  visibleFor(db: ReturnType<typeof getDb>, user: User | null): Announcement[] {
    const today = new Date().toISOString().slice(0, 10);
    return db.announcements
      .filter((a) => a.status === "published")
      .filter((a) => !a.expiresAt || a.expiresAt >= today)
      .filter((a) => {
        if (!user) return a.audience === "university";
        if (user.role === "admin") return true;
        if (a.audience === "university") return true;
        if (a.audience === "department") return a.departmentId === user.departmentId;
        if (user.role === "examination") return a.audience === "examination_staff";
        if (user.role === "student") return a.audience === "students";
        if (user.role === "teacher" || user.role === "hod") return a.audience === "teachers";
        return false;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async create(input: AnnouncementInput, actor: Actor): Promise<Announcement> {
    await delay();
    if (!input.title.trim()) throw new AppError("required", "Title is required.");
    if (!input.content.trim()) throw new AppError("required", "Content is required.");
    if (input.audience === "department" && !input.departmentId) {
      throw new AppError("missing_department", "Select a department for a department announcement.");
    }
    return commit(
      (draft) => {
        const announcement: Announcement = {
          id: nextId("ann", draft.announcements.map((a) => a.id)),
          title: input.title.trim(),
          content: input.content.trim(),
          audience: input.audience,
          departmentId: input.audience === "department" ? input.departmentId : null,
          authorId: actor.id,
          createdAt: new Date().toISOString(),
          expiresAt: input.expiresAt,
          status: input.status,
          readBy: [],
        };
        draft.announcements = [announcement, ...draft.announcements];
        return announcement;
      },
      { actorId: actor.id, actorName: actor.name, action: "create", entityType: "Announcement", entityId: "new", description: `Created announcement “${input.title}”.` },
    );
  },

  async update(id: ID, input: AnnouncementInput, actor: Actor): Promise<Announcement> {
    await delay();
    const db = getDb();
    if (!db.announcements.some((a) => a.id === id)) throw new AppError("not_found", "Announcement not found.");
    if (!input.title.trim()) throw new AppError("required", "Title is required.");
    if (input.audience === "department" && !input.departmentId) {
      throw new AppError("missing_department", "Select a department for a department announcement.");
    }
    return commit(
      (draft) => {
        const announcement = draft.announcements.find((a) => a.id === id)!;
        announcement.title = input.title.trim();
        announcement.content = input.content.trim();
        announcement.audience = input.audience;
        announcement.departmentId = input.audience === "department" ? input.departmentId : null;
        announcement.expiresAt = input.expiresAt;
        announcement.status = input.status;
        return announcement;
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "Announcement", entityId: id, description: `Updated announcement “${input.title}”.` },
    );
  },

  async setStatus(id: ID, status: Announcement["status"], actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const announcement = db.announcements.find((a) => a.id === id);
    if (!announcement) throw new AppError("not_found", "Announcement not found.");
    commit(
      (draft) => {
        const target = draft.announcements.find((a) => a.id === id)!;
        target.status = status;
      },
      { actorId: actor.id, actorName: actor.name, action: status === "published" ? "publish" : "update", entityType: "Announcement", entityId: id, description: `${status === "published" ? "Published" : "Unpublished"} “${announcement.title}”.` },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    const announcement = getDb().announcements.find((a) => a.id === id);
    if (!announcement) throw new AppError("not_found", "Announcement not found.");
    commit(
      (draft) => {
        draft.announcements = draft.announcements.filter((a) => a.id !== id);
      },
      { actorId: actor.id, actorName: actor.name, action: "delete", entityType: "Announcement", entityId: id, description: `Deleted announcement “${announcement.title}”.` },
    );
  },

  async markRead(id: ID, userId: ID): Promise<void> {
    commit((draft) => {
      const announcement = draft.announcements.find((a) => a.id === id);
      if (announcement && !announcement.readBy.includes(userId)) {
        announcement.readBy = [...announcement.readBy, userId];
      }
    });
  },
};
