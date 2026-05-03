import { prisma } from "./prisma";
import { JWTPayload } from "./auth";
import { NextRequest } from "next/server";

export type AuditAcao = "CREATE" | "UPDATE" | "DELETE";

interface AuditParams {
  user: JWTPayload;
  req?: NextRequest;
  acao: AuditAcao;
  entidade: string;
  entidadeId: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const ip = params.req
      ? (params.req.headers.get("x-forwarded-for") ?? params.req.headers.get("x-real-ip") ?? null)
      : null;

    await prisma.auditLog.create({
      data: {
        userId: params.user.userId,
        userEmail: params.user.email,
        organizationId: params.user.organizationId,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        dadosAntes: params.dadosAntes ?? undefined,
        dadosDepois: params.dadosDepois ?? undefined,
        ip,
      },
    });
  } catch {
    // audit failures never break the main operation
  }
}
