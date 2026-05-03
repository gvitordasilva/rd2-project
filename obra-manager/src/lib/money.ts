/**
 * Converte qualquer valor Decimal do Prisma (ou string/number) para número com 2 casas decimais.
 * Evita erros de arredondamento float ao usar Math.round com fator 100.
 */
export function toMoney(value: unknown): number {
  const n = Number(value ?? 0);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

/** Soma segura de valores monetários sem perda de precisão. */
export function addMoney(...values: unknown[]): number {
  const cents = values.reduce<number>((sum, v) => sum + Math.round(Number(v ?? 0) * 100), 0);
  return cents / 100;
}

/** Subtração segura de valores monetários. */
export function subMoney(a: unknown, b: unknown): number {
  return (Math.round(Number(a ?? 0) * 100) - Math.round(Number(b ?? 0) * 100)) / 100;
}
