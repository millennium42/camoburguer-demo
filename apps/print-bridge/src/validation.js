import { timingSafeEqual } from "node:crypto";

export function equalSecret(actual, expected) {
  const left = Buffer.from(String(actual || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function safeId(value, field) {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalized)) {
    const error = new Error(`${field} inválido`);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

export function validPrintContent(value) {
  return typeof value === "string"
    && value.length > 0
    && Buffer.byteLength(value, "utf8") <= 64 * 1024;
}
