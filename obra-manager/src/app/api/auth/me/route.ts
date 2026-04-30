import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { successResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
  });

  return successResponse(user);
}
