import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";

const cargoSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.cargo.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return notFoundResponse("Cargo não encontrado");

  const data = await req.json();
  const result = cargoSchema.safeParse(data);
  if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

  const cargo = await prisma.cargo.update({ where: { id }, data: result.data });
  return successResponse(cargo);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "funcionarios:write");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const orgWhere = auth.user.organizationId ? { organizationId: auth.user.organizationId } : {};
  const existing = await prisma.cargo.findFirst({ where: { id, ...orgWhere } });
  if (!existing) return notFoundResponse("Cargo não encontrado");

  await prisma.cargo.delete({ where: { id } });
  return successResponse({ deleted: true });
}
