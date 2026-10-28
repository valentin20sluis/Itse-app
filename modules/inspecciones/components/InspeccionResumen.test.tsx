import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InspeccionResumen } from "@/modules/inspecciones/components/InspeccionResumen";

afterEach(cleanup);

describe("InspeccionResumen (cliente)", () => {
  it("muestra nombres, fecha y aviso con el teléfono", () => {
    render(
      <InspeccionResumen
        total={2}
        nombres={["Ana Pérez", "Luis Soto"]}
        programadaPara={new Date("2026-11-03T05:00:00.000Z")}
        avisoContacto={{ telefono: "987654321" }}
      />,
    );
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Luis Soto")).toBeInTheDocument();
    expect(screen.getByText("Inspección programada: 03/11/2026")).toBeInTheDocument();
    expect(
      screen.getByText(
        "El inspector se comunicará contigo al número registrado del solicitante (987654321). Mantente atento a tu teléfono.",
      ),
    ).toBeInTheDocument();
  });

  it("omite el número si falta y no muestra aviso sin avisoContacto", () => {
    const { rerender } = render(
      <InspeccionResumen total={1} nombres={["Ana Pérez"]} avisoContacto={{ telefono: null }} />,
    );
    expect(
      screen.getByText(
        "El inspector se comunicará contigo al número registrado del solicitante. Mantente atento a tu teléfono.",
      ),
    ).toBeInTheDocument();
    rerender(<InspeccionResumen total={1} nombres={["Ana Pérez"]} />);
    expect(screen.queryByText(/se comunicará/)).toBeNull();
  });
});
