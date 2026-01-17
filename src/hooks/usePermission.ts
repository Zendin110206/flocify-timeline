// src/hooks/usePermission.ts
import { Task } from "@/lib/types";
import { ADMINS, SUPER_ADMIN } from "@/lib/data";

export function usePermission(currentUser: string) {
  const isSuperAdmin = currentUser === SUPER_ADMIN;
  const isAdmin = ADMINS.includes(currentUser);

  // Helper: Cek apakah user adalah pemilik tugas atau member
  const isOwnerOrMember = (task: Task) => {
    return task.pic === currentUser || task.members.includes(currentUser);
  };

  return {
    // Role Dasar
    isSuperAdmin,
    isAdmin,

    // --- ATURAN TUGAS (TASK RULES) ---

    // 1. EDIT: Admin boleh, Tim boleh (KECUALI kalau status DONE, terkunci!)
    canEditTask: (task: Task) => {
      if (task.status === "done" && !isAdmin) return false; // Kunci mati kalau Done
      return isSuperAdmin || isAdmin || isOwnerOrMember(task);
    },

    // 2. DELETE: HANYA Admin yang boleh hapus. PIC DILARANG HAPUS.
    // (Biar data aman dan tidak ada sabotase)
    canDeleteTask: () => {
      return isSuperAdmin || isAdmin;
    },

    // 3. UPDATE STATUS (Geser Kartu)
    canUpdateStatus: (task: Task) => {
      if (task.status === "done" && !isAdmin) return false; // Kalau udah Done, cuma admin yang boleh buka lagi
      return isSuperAdmin || isAdmin || isOwnerOrMember(task);
    },

    // 4. DEADLINE: Hanya Super Admin (Zaenal)
    canChangeDeadline: () => {
      return isSuperAdmin;
    },

    // 5. MARK DONE (ACC): HANYA Admin yang boleh ACC jadi Done.
    // Member cuma boleh sampai "Review".
    canMarkDone: () => {
      return isSuperAdmin || isAdmin;
    },

    // --- ATURAN FITUR KHUSUS ---

    canCloseSprint: () => isAdmin,
    canResetSystem: () => isAdmin,
  };
}
