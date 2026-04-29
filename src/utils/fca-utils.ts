/**
 * FCA Utilities
 * 
 * Re-implementation of basic FCA utility functions to avoid heavy dependencies.
 */

export function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  return "";
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function date(v: unknown): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  }
  return Date.now();
}

export function now(): number {
  return Date.now();
}
