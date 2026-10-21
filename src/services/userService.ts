import type { ID, ListParams, Paginated, Role, User } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface UserInput {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  departmentId: ID | null;
  status: User["status"];
}

function validate(db: ReturnType<typeof getDb>, input: UserInput, ignoreId?: ID): void {
  if (!input.fullName.trim()) throw new AppError("required", "Full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new AppError("invalid_email", "Enter a valid email address.");
  }
  const duplicate = db.users.find(
    (u) => u.id !== ignoreId && u.email.toLowerCase() === input.email.trim().toLowerCase(),
  );
  if (duplicate) throw new AppError("duplicate_email", "That email address is already registered.");
  if ((input.role === "hod" || input.role === "teacher" || input.role === "student") && !input.departmentId) {
    throw new AppError("missing_department", `A department is required for the ${input.role} role.`);
  }
}

function activeAdmins(db: ReturnType<typeof getDb>): User[] {
  return db.users.filter((u) => u.role === "admin" && u.status === "active");
}

export const userService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<User> {
    const { search, role, status, departmentId } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.users.filter((u) => {
      if (!matches(q, [u.fullName, u.email, u.phone])) return false;
      if (role && u.role !== role) return false;
      if (status && u.status !== status) return false;
      if (departmentId && u.departmentId !== departmentId) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  byId(db: ReturnType<typeof getDb>, id: ID): User | undefined {
    return db.users.find((u) => u.id === id);
  },

  roles(db: ReturnType<typeof getDb>) {
    const counts: Record<string, number> = {};
    for (const user of db.users) counts[user.role] = (counts[user.role] ?? 0) + 1;
    return counts;
  },

  async create(input: UserInput, actor: Actor): Promise<User> {
    await delay();
    validate(getDb(), input);
    return commit(
      (draft) => {
        const user: User = {
          id: nextId("user", draft.users.map((u) => u.id)),
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone.trim(),
          role: input.role,
          departmentId: input.departmentId,
          status: input.status,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        draft.users.push(user);
        return user;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "create",
        entityType: "User",
        entityId: "new",
        description: `Created user ${input.fullName} (${input.role}).`,
      },
    );
  },

  async update(id: ID, input: UserInput, actor: Actor): Promise<User> {
    await delay();
    const db = getDb();
    const existing = db.users.find((u) => u.id === id);
    if (!existing) throw new AppError("not_found", "User not found.");
    validate(db, input, id);
    if (
      existing.role === "admin" &&
      (input.role !== "admin" || input.status !== "active") &&
      activeAdmins(db).length <= 1
    ) {
      throw new AppError("last_admin", "You cannot demote or deactivate the only active administrator.");
    }
    return commit(
      (draft) => {
        const user = draft.users.find((u) => u.id === id)!;
        user.fullName = input.fullName.trim();
        user.email = input.email.trim().toLowerCase();
        user.phone = input.phone.trim();
        user.role = input.role;
        user.departmentId = input.departmentId;
        user.status = input.status;
        return user;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "update",
        entityType: "User",
        entityId: id,
        description: `Updated user ${input.fullName}.`,
      },
    );
  },

  async setStatus(id: ID, status: User["status"], actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new AppError("not_found", "User not found.");
    if (user.role === "admin" && status === "inactive" && activeAdmins(db).length <= 1) {
      throw new AppError("last_admin", "You cannot deactivate the only active administrator.");
    }
    commit(
      (draft) => {
        const target = draft.users.find((u) => u.id === id)!;
        target.status = status;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: status === "active" ? "activate" : "deactivate",
        entityType: "User",
        entityId: id,
        description: `${status === "active" ? "Activated" : "Deactivated"} account for ${user.fullName}.`,
      },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new AppError("not_found", "User not found.");
    if (user.role === "admin") throw new AppError("protected", "Administrator accounts cannot be deleted.");
    if (user.id === actor.id) throw new AppError("self", "You cannot delete your own account.");
    commit(
      (draft) => {
        draft.users = draft.users.filter((u) => u.id !== id);
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "delete",
        entityType: "User",
        entityId: id,
        description: `Deleted user ${user.fullName}.`,
      },
    );
  },
};
