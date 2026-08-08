import { describe, expect, it } from "vitest";

import { GeneratorRegistry, type GeneratorBundle } from "./registry";

function stubBundle(questionType: "latin_square" | "figure_sequence"): GeneratorBundle {
  return {
    generator: { questionType, version: "1", generate: () => { throw new Error("unused"); } },
    solver: { questionType, version: "1", solve: () => null },
    validator: {
      questionType,
      version: "1",
      validate: () => ({ valid: true, solution: null, checks: [] }),
    },
    fingerprint: () => null,
  };
}

describe("GeneratorRegistry", () => {
  it("registers and retrieves a matching bundle", () => {
    const registry = new GeneratorRegistry();
    const bundle = stubBundle("latin_square");
    registry.register(bundle);
    expect(registry.get("latin_square")).toBe(bundle);
    expect(registry.list()).toEqual(["latin_square"]);
  });

  it("rejects duplicate registrations", () => {
    const registry = new GeneratorRegistry();
    registry.register(stubBundle("latin_square"));
    expect(() => registry.register(stubBundle("latin_square"))).toThrow(/already/);
  });

  it("rejects mismatched component types", () => {
    const registry = new GeneratorRegistry();
    const bundle = stubBundle("latin_square");
    bundle.solver = { ...bundle.solver, questionType: "figure_sequence" };
    expect(() => registry.register(bundle)).toThrow(/must match/);
  });
});
