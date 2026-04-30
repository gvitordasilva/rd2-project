import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api-response";

const cargoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  descricao: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "funcionarios:read");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) return successResponse([]);

  const cargos = await prisma.cargo.findMany({
    where: { organizationId: auth.user.organizationId },
    orderBy: { nome: "asc" },
  });

  return successResponse(cargos);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "funcionarios:write");
  if (auth instanceof Response) return auth;

  if (!auth.user.organizationId) {
    return errorResponse("Super Admin não pode criar cargos diretamente", 403);
  }

  const data = await req.json();
  const result = cargoSchema.safeParse(data);
  if (!result.success) return errorResponse("Dados inválidos", 400, result.error.flatten());

  const existing = await prisma.cargo.findFirst({
    where: { nome: { equals: result.data.nome, mode: "insensitive" }, organizationId: auth.user.organizationId },
  });
  if (existing) return errorResponse("Cargo já cadastrado", 409);

  const cargo = await prisma.cargo.create({
    data: { ...result.data, organizationId: auth.user.organizationId },
  });

  return successResponse(cargo, 201);
}
