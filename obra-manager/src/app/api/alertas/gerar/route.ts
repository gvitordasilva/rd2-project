import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { verificarEGerarAlertas } from "@/lib/alertas";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "alertas:write");
  if (auth instanceof Response) return auth;

  try {
    const result = await verificarEGerarAlertas(auth.user.organizationId);
    return successResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return errorResponse(message, 500);
  }
}
