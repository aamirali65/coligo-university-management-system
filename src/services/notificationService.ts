import type { AppNotification, ID } from "@/types";
import { commit, getDb } from "./mock/store";

export const notificationService = {
  forUser(db: ReturnType<typeof getDb>, userId: ID): AppNotification[] {
    return db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  unreadCount(db: ReturnType<typeof getDb>, userId: ID): number {
    return db.notifications.filter((n) => n.userId === userId && !n.read).length;
  },

  markRead(id: ID): void {
    commit((draft) => {
      const notification = draft.notifications.find((n) => n.id === id);
      if (notification) notification.read = true;
    });
  },

  markAllRead(userId: ID): void {
    commit((draft) => {
      draft.notifications = draft.notifications.map((n) =>
        n.userId === userId ? { ...n, read: true } : n,
      );
    });
  },
};
