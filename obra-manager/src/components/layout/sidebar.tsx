"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Building2, Users, Wrench, DollarSign,
  Bell, FileText, ChevronLeft, ChevronRight, LogOut, HardHat, Menu, ShieldCheck,
  Briefcase, UserCog, Calculator, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/obras", label: "Obras", icon: Building2 },
  { href: "/orcamentos", label: "Orçamentos", icon: Calculator },
  { href: "/funcionarios", label: "Funcionários", icon: Users },
  { href: "/cargos", label: "Cargos", icon: Briefcase },
  { href: "/maquinarios", label: "Maquinário", icon: Wrench },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/usuarios", label: "Usuários", icon: UserCog },
];

const adminNavItems = [
  { href: "/admin", label: "Organizações", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isSuperAdmin } = useAuth();
  const { apiFetch } = useApi();
  const [collapsed, setCollapsed] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const superAdmin = isSuperAdmin();

  useEffect(() => {
    if (!superAdmin) {
      apiFetch<{ data: { totalNaoLidos: number } }>("/api/alertas").then((res) => {
        if (res.data) setAlertCount(res.data.totalNaoLidos);
      }).catch(() => {});
    }
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-[var(--sidebar-accent)]", collapsed && "justify-center")}>
        <div className="flex items-center justify-center w-9 h-9 bg-[var(--primary)] rounded-lg shrink-0">
          <HardHat className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-white text-base leading-tight">Obra</span>
            <span className="font-bold text-blue-400 text-base leading-tight"> Manager</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {superAdmin ? (
          <>
            {!collapsed && (
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--sidebar-muted)] font-semibold">
                Administração
              </p>
            )}
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group",
                    isActive
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-white",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </>
        ) : (
          <>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group",
                    isActive
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-white",
                    collapsed && "justify-center"
                  )}
                >
                  <div className="relative shrink-0">
                    <Icon className="w-5 h-5" />
                    {item.href === "/alertas" && alertCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                        {alertCount > 9 ? "9+" : alertCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-[var(--sidebar-accent)] p-3">
        {!collapsed && user && (
          <div className="px-2 py-2 mb-2">
            <p className="text-white text-sm font-medium truncate">{user.nome}</p>
            <p className="text-[var(--sidebar-muted)] text-xs truncate">
              {user.perfil === "SUPER_ADMIN" ? "Super Admin" : user.organizationNome || user.perfil}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {!collapsed && (
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-red-400 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          )}
          {collapsed && (
            <button
              onClick={logout}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[var(--sidebar)] rounded-lg text-white shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-full z-50 transition-transform bg-[var(--sidebar)] w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-full bg-[var(--sidebar)] transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
