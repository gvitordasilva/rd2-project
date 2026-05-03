"use client";
import { usePathname } from "next/navigation";
import { Bell, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/obras": "Obras",
  "/funcionarios": "Funcionários",
  "/maquinarios": "Maquinário",
  "/financeiro": "Financeiro",
  "/alertas": "Central de Alertas",
  "/documentos": "Documentos",
  "/cargos": "Cargos",
  "/usuarios": "Usuários",
  "/orcamentos": "Orçamentos",
  "/relatorios": "Relatórios de Folha",
  "/admin": "Gerenciamento de Organizações",
};

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  if (pathname !== "/dashboard" && pathname !== "/admin") {
    const root = parts[0] === "admin" ? "/admin" : "/dashboard";
    const rootLabel = parts[0] === "admin" ? "Admin" : "Início";
    crumbs.push({ label: rootLabel, href: root });
  }

  let currentPath = "";
  for (const part of parts) {
    currentPath += `/${part}`;
    const label = PAGE_TITLES[currentPath] || part;
    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const { user, isSuperAdmin } = useAuth();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = PAGE_TITLES[pathname] || breadcrumbs[breadcrumbs.length - 1]?.label || "Página";

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex flex-col ml-10 lg:ml-0">
        <h1 className="text-lg font-semibold text-[var(--foreground)] leading-tight">{pageTitle}</h1>
        <nav className="flex items-center gap-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.href}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span className="text-[var(--muted-foreground)] text-xs">/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link href={crumb.href} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-xs text-[var(--primary)] font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {!isSuperAdmin() && (
          <Link href="/alertas" className="relative p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors">
            <Bell className="w-5 h-5 text-[var(--muted-foreground)]" />
          </Link>
        )}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSuperAdmin() ? "bg-amber-500" : "bg-[var(--primary)]"}`}>
            {isSuperAdmin() ? (
              <ShieldCheck className="w-4 h-4 text-white" />
            ) : (
              <span className="text-white text-sm font-semibold">
                {user?.nome?.charAt(0).toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-[var(--foreground)] leading-tight">{user?.nome}</p>
            {user?.organizationNome && (
              <p className="text-xs text-[var(--muted-foreground)] leading-tight">{user.organizationNome}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
