import type { GenerationSeed } from "./types";

const UINT32_RANGE = 4_294_967_296;

export function hashSeed(seed: GenerationSeed): number {
  if (!seed.trim()) throw new Error("A non-empty generation seed is required.");

  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export class SeededRandom {
  private state: number;

  constructor(readonly seed: GenerationSeed) {
    this.state = hashSeed(seed);
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  }

  integer(minimum: number, maximum: number): number {
    if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)) {
      throw new RangeError("Random integer bounds must be safe integers.");
    }
    if (minimum > maximum) {
      throw new RangeError("Random integer minimum cannot exceed maximum.");
    }
    const width = maximum - minimum + 1;
    if (!Number.isSafeInteger(width) || width > UINT32_RANGE) {
      throw new RangeError("Random integer range cannot exceed 2^32 values.");
    }
    return minimum + Math.floor(this.next() * width);
  }

  boolean(probability = 0.5): boolean {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new RangeError("Probability must be between 0 and 1.");
    }
    return this.next() < probability;
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new RangeError("Cannot pick from an empty array.");
    return values[this.integer(0, values.length - 1)];
  }

  shuffle<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(0, index);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  fork(namespace: string): SeededRandom {
    if (!namespace.trim()) throw new Error("A non-empty random namespace is required.");
    return new SeededRandom(`${this.seed}\u001f${namespace}`);
  }
}

