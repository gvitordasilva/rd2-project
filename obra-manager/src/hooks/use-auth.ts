"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  organizationId: string | null;
  organizationNome: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isGerente: () => boolean;
  isFinanceiro: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      logout: async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        set({ user: null, accessToken: null });
        window.location.href = "/login";
      },
      isSuperAdmin: () => get().user?.perfil === "SUPER_ADMIN",
      isAdmin: () => ["SUPER_ADMIN", "ADMIN"].includes(get().user?.perfil || ""),
      isGerente: () => ["SUPER_ADMIN", "ADMIN", "GERENTE"].includes(get().user?.perfil || ""),
      isFinanceiro: () => ["SUPER_ADMIN", "ADMIN", "GERENTE", "FINANCEIRO"].includes(get().user?.perfil || ""),
    }),
    { name: "obra-manager-auth" }
  )
);
