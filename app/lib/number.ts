import { Prisma } from '@prisma/client';

export type NumericLike = number | string | Prisma.Decimal | null | undefined;

export function toNumber(value: NumericLike): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  // Prisma.Decimal
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((value as any).toNumber) return (value as any).toNumber();
  } catch {
    // ignore
  }
  const n = Number(value as unknown);
  return Number.isFinite(n) ? n : null;
}

export function toNumberOrZero(value: NumericLike): number {
  return toNumber(value) ?? 0;
}

