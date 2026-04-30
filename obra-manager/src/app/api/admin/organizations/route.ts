import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/rbac";
import { organizationSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const createOrgSchema = organizationSchema.extend({
  primeiroAdmin: z.object({
    nome: z.string().min(3),
    email: z.string().email(),
    senha: z.string().min(6),
  }).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof Response) return auth;

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, obras: true } },
    },
  });

  return successResponse(organizations);
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const data = await req.json();
    const result = createOrgSchema.safeParse(data);
    if (!result.success) {
      return errorResponse("Dados inválidos", 400, result.error.flatten());
    }

    const existing = await prisma.organization.findUnique({ where: { slug: result.data.slug } });
    if (existing) {
      return errorResponse("Já existe uma organização com este código", 409);
    }

    if (result.data.primeiroAdmin) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: result.data.primeiroAdmin.email.toLowerCase() },
      });
      if (emailTaken) return errorResponse("E-mail do admin já cadastrado", 409);
    }

    const { primeiroAdmin, ...orgData } = result.data;

    const org = await prisma.organization.create({ data: orgData });

    if (primeiroAdmin) {
      const senhaHash = await hashPassword(primeiroAdmin.senha);
      await prisma.user.create({
        data: {
          nome: primeiroAdmin.nome,
          email: primeiroAdmin.email.toLowerCase(),
          senha: senhaHash,
          perfil: "ADMIN",
          organizationId: org.id,
        },
      });
    }

    const orgWithCount = await prisma.organization.findUnique({
      where: { id: org.id },
      include: { _count: { select: { users: true, obras: true } } },
    });

    return successResponse(orgWithCount, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}
