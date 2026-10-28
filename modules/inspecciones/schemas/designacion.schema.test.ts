import { describe, expect, it } from "vitest";
import { designacionSchema } from "./designacion.schema";

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
];
const ok = (inspectorIds: string[]) => designacionSchema.safeParse({ inspectorIds }).success;

describe("designacionSchema", () => {
  it("acepta de 1 a 3 uuid", () => {
    expect(ok(ids.slice(0, 1))).toBe(true);
    expect(ok(ids.slice(0, 3))).toBe(true);
  });
  it("rechaza 0 y 4", () => {
    expect(ok([])).toBe(false);
    expect(ok(ids)).toBe(false);
  });
  it("rechaza valores que no son uuid", () => {
    expect(ok(["abc"])).toBe(false);
  });
  it("los repetidos pasan el schema (los rechaza el servicio por cantidad)", () => {
    expect(ok([ids[0], ids[0]])).toBe(true);
  });
});
