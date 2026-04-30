import { UserRole } from "@/generated/prisma";
import { JWTPayload, getAuthUser } from "./auth";
import { NextRequest } from "next/server";
import { forbiddenResponse, unauthorizedResponse } from "./api-response";

type Permission =
  | "obras:read" | "obras:write" | "obras:delete"
  | "funcionarios:read" | "funcionarios:write" | "funcionarios:delete"
  | "financeiro:read" | "financeiro:write" | "financeiro:delete"
  | "maquinario:read" | "maquinario:write" | "maquinario:delete"
  | "documentos:read" | "documentos:write" | "documentos:delete"
  | "alertas:read" | "alertas:write"
  | "usuarios:manage"
  | "organizations:manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "obras:read", "obras:write", "obras:delete",
    "funcionarios:read", "funcionarios:write", "funcionarios:delete",
    "financeiro:read", "financeiro:write", "financeiro:delete",
    "maquinario:read", "maquinario:write", "maquinario:delete",
    "documentos:read", "documentos:write", "documentos:delete",
    "alertas:read", "alertas:write",
    "usuarios:manage",
    "organizations:manage",
  ],
  ADMIN: [
    "obras:read", "obras:write", "obras:delete",
    "funcionarios:read", "funcionarios:write", "funcionarios:delete",
    "financeiro:read", "financeiro:write", "financeiro:delete",
    "maquinario:read", "maquinario:write", "maquinario:delete",
    "documentos:read", "documentos:write", "documentos:delete",
    "alertas:read", "alertas:write",
    "usuarios:manage",
  ],
  GERENTE: [
    "obras:read", "obras:write",
    "funcionarios:read", "funcionarios:write",
    "financeiro:read", "financeiro:write",
    "maquinario:read", "maquinario:write",
    "documentos:read", "documentos:write",
    "alertas:read", "alertas:write",
  ],
  FINANCEIRO: [
    "obras:read",
    "funcionarios:read",
    "financeiro:read", "financeiro:write", "financeiro:delete",
    "maquinario:read",
    "documentos:read", "documentos:write",
    "alertas:read",
  ],
  VISUALIZADOR: [
    "obras:read",
    "funcionarios:read",
    "financeiro:read",
    "maquinario:read",
    "documentos:read",
    "alertas:read",
  ],
};

export function hasPermission(perfil: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[perfil as UserRole] || [];
  return perms.includes(permission);
}

export async function requireAuth(
  req: NextRequest,
  permission?: Permission
): Promise<{ user: JWTPayload } | Response> {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (permission && !hasPermission(user.perfil, permission)) {
    return forbiddenResponse();
  }
  return { user };
}

export async function requireSuperAdmin(
  req: NextRequest
): Promise<{ user: JWTPayload } | Response> {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.perfil !== "SUPER_ADMIN") return forbiddenResponse();
  return { user };
}
