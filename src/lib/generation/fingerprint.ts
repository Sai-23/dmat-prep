import type { JsonValue } from "./types";

export function canonicalize(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("Fingerprint values must contain only finite numbers.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
  return `{${entries.join(",")}}`;
}

function fnv1a(value: string, offset: number): number {
  let hash = offset;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function createFingerprint(namespace: string, semanticValue: JsonValue): string {
  if (!namespace.trim()) throw new Error("A fingerprint namespace is required.");
  const canonical = `${namespace}:${canonicalize(semanticValue)}`;
  const first = fnv1a(canonical, 2_166_136_261).toString(16).padStart(8, "0");
  const second = fnv1a(canonical, 3_335_098_873).toString(16).padStart(8, "0");
  return `${namespace}:v1:${first}${second}`;
}

