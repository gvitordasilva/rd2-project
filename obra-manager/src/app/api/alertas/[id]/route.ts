import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { successResponse, notFoundResponse } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "alertas:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const alerta = await prisma.alerta.findFirst({ where: { id, ...orgWhere } });
  if (!alerta) return notFoundResponse("Alerta não encontrado");

  const updated = await prisma.alerta.update({
    where: { id },
    data: { lido: true },
  });

  return successResponse(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "alertas:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const alerta = await prisma.alerta.findFirst({ where: { id, ...orgWhere } });
  if (!alerta) return notFoundResponse("Alerta não encontrado");

  await prisma.alerta.delete({ where: { id } });
  return successResponse({ deleted: true });
}
