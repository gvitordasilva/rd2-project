import { NextResponse } from "next/server";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400, errors?: unknown) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

export function unauthorizedResponse(message = "Não autorizado") {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = "Acesso negado") {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = "Recurso não encontrado") {
  return errorResponse(message, 404);
}

export function serverErrorResponse(message = "Erro interno do servidor") {
  return errorResponse(message, 500);
}
