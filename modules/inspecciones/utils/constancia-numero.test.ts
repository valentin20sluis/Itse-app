import { describe, expect, it } from "vitest";
import { numeroConstancia } from "@/modules/inspecciones/utils/constancia-numero";

describe("numeroConstancia", () => {
  it("deriva CD-AAAA-NNNNN del número del expediente", () => {
    expect(numeroConstancia("EXP-2026-00001")).toBe("CD-2026-00001");
  });

  it.each(["", "ABC-2026-00001", "EXP-26-00001", "EXP-2026-0001", "EXP-2026-000001", " EXP-2026-00001", "EXP-2026-00001\n"])(
    "devuelve null para %j",
    (s) => {
      expect(numeroConstancia(s)).toBeNull();
    },
  );
});
