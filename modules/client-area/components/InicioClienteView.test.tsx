import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InicioClienteView } from "@/modules/client-area/components/InicioClienteView";
import type { InicioCliente, PasoSiguiente } from "@/modules/client-area/types/inicio.types";

afterEach(cleanup);

const vacio: InicioCliente = {
  pasos: [],
  expedientes: { total: 0, enCurso: 0, finalizados: 0 },
  establecimientos: { total: 0, conSolicitud: 0, libres: 0, lista: [] },
  certificados: { total: 0, vigentes: 0, porVencer: 0, vencidos: 0, avisos: [] },
  puedeSolicitar: false,
};

const paso = (p: Partial<PasoSiguiente> = {}): PasoSiguiente => ({
  expedienteId: "e1",
  establecimientoNombre: "Bodega Ficticia",
  numero: "EXP-2026-00001",
  estado: "PRESENTADO",
  noCumple: false,
  mensaje: "Recibimos tu solicitud. En breve la revisaremos.",
  accion: { label: "Ver detalle", href: "/mi-cuenta/expedientes/e1", ariaLabel: "Ver detalle (Bodega Ficticia)" },
  urgencia: 1,
  ...p,
});

const conLocales = (libres: number, ocupados: number): InicioCliente["establecimientos"] => {
  const lista = [
    ...Array.from({ length: libres }, (_, i) => ({ id: `l${i}`, nombre: `Libre ${i}`, libre: true, detalle: "Disponible" })),
    ...Array.from({ length: ocupados }, (_, i) => ({ id: `o${i}`, nombre: `Ocupado ${i}`, libre: false, detalle: "EXP-2026-00001" })),
  ];
  return { total: lista.length, conSolicitud: ocupados, libres, lista };
};

const cert = (estado: "POR_VENCER" | "VENCIDO", dias: number) => ({
  expedienteId: `c${dias}`,
  numero: "C-1",
  nombreComercial: estado === "VENCIDO" ? "Taller Vencido" : "Cafe Por Vencer",
  emitidoAt: new Date("2025-01-01T05:00:00.000Z"),
  venceAt: new Date("2026-12-01T05:00:00.000Z"),
  diasRestantes: dias,
  estado,
});

describe("InicioClienteView", () => {
  it("saluda en un único h1", () => {
    render(<InicioClienteView inicio={vacio} saludo="Ana" />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Hola, Ana" })).toBeInTheDocument();
  });

  it("sin establecimientos: registra el primero, sin resumen ni Nueva solicitud", () => {
    render(<InicioClienteView inicio={vacio} saludo="Ana" />);
    expect(screen.getByText("Registra tu primer establecimiento")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Registrar establecimiento/ })).toHaveAttribute(
      "href",
      "/mi-cuenta/establecimientos",
    );
    expect(screen.queryByText("Tu resumen")).not.toBeInTheDocument();
    expect(screen.queryByText(/Nueva solicitud/)).not.toBeInTheDocument();
  });

  it("con locales libres y sin solicitudes ofrece Nueva solicitud", () => {
    render(
      <InicioClienteView
        inicio={{ ...vacio, establecimientos: conLocales(2, 0), puedeSolicitar: true }}
        saludo="Ana"
      />,
    );
    expect(screen.getByText("Aún no tienes solicitudes", { selector: "h2" })).toBeInTheDocument();
    const enlaces = screen.getAllByRole("link", { name: /Nueva solicitud/ });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) expect(a).toHaveAttribute("href", "/mi-cuenta/nueva-solicitud");
  });

  it("con todos los locales ocupados no ofrece Nueva solicitud y explica qué hacer", () => {
    render(
      <InicioClienteView
        inicio={{
          ...vacio,
          pasos: [paso()],
          expedientes: { total: 1, enCurso: 1, finalizados: 0 },
          establecimientos: conLocales(0, 1),
          puedeSolicitar: false,
        }}
        saludo="Ana"
      />,
    );
    expect(screen.queryByRole("link", { name: /Nueva solicitud/ })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Todos tus establecimientos ya tienen una solicitud. Para solicitar otra inspección, registra otro establecimiento.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrar otro establecimiento" })).toHaveAttribute(
      "href",
      "/mi-cuenta/establecimientos",
    );
  });

  it("un paso que requiere acción muestra la etiqueta y el enlace Pagar con nombre accesible", () => {
    render(
      <InicioClienteView
        inicio={{
          ...vacio,
          pasos: [
            paso({
              estado: "BORRADOR",
              numero: null,
              urgencia: 0,
              mensaje: "Tu solicitud está completa. Falta pagar la tasa para enviarla.",
              accion: {
                label: "Pagar",
                href: "/mi-cuenta/nueva-solicitud?borrador=e1",
                ariaLabel: "Pagar (Bodega Ficticia)",
              },
            }),
          ],
          expedientes: { total: 1, enCurso: 1, finalizados: 0 },
          establecimientos: conLocales(0, 1),
        }}
        saludo="Ana"
      />,
    );
    expect(screen.getByText("Requiere tu atención")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pagar (Bodega Ficticia)" })).toHaveAttribute(
      "href",
      "/mi-cuenta/nueva-solicitud?borrador=e1",
    );
  });

  it("los pasos sin acción pendiente no llevan la etiqueta y muestran el motivo", () => {
    render(
      <InicioClienteView
        inicio={{
          ...vacio,
          pasos: [paso({ motivo: "Falta el plano" })],
          expedientes: { total: 1, enCurso: 1, finalizados: 0 },
          establecimientos: conLocales(0, 1),
        }}
        saludo="Ana"
      />,
    );
    expect(screen.queryByText("Requiere tu atención")).not.toBeInTheDocument();
    expect(screen.getByText("Motivo: Falta el plano")).toBeInTheDocument();
  });

  it("avisa de certificados por vencer y vencidos", () => {
    render(
      <InicioClienteView
        inicio={{
          ...vacio,
          expedientes: { total: 2, enCurso: 0, finalizados: 2 },
          establecimientos: conLocales(0, 2),
          certificados: {
            total: 2,
            vigentes: 0,
            porVencer: 1,
            vencidos: 1,
            avisos: [cert("VENCIDO", -3), cert("POR_VENCER", 20)],
          },
        }}
        saludo="Ana"
      />,
    );
    expect(screen.getByText(/Tu certificado venció/)).toBeInTheDocument();
    expect(screen.getByText(/Tu certificado vence en 20 días/)).toBeInTheDocument();
    expect(screen.getByText("Taller Vencido:")).toBeInTheDocument();
    expect(screen.getByText("Por vencer (60 días o menos)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver mis certificados" })).toHaveAttribute(
      "href",
      "/mi-cuenta/certificados",
    );
  });

  it("sin certificados muestra el texto vacío y sin segundo botón en Expedientes", () => {
    render(
      <InicioClienteView
        inicio={{ ...vacio, establecimientos: conLocales(1, 0), puedeSolicitar: true }}
        saludo="Ana"
      />,
    );
    expect(
      screen.getByText("Aún no tienes certificados. Aparecerán aquí cuando termine tu trámite."),
    ).toBeInTheDocument();
    expect(screen.getByText("Aún no tienes solicitudes.")).toBeInTheDocument();
  });

  it("los accesos rápidos apuntan a los destinos correctos", () => {
    render(
      <InicioClienteView
        inicio={{ ...vacio, establecimientos: conLocales(1, 0), puedeSolicitar: true }}
        saludo="Ana"
      />,
    );
    const seccion = screen.getByRole("heading", { name: "Accesos rápidos" }).closest("section") as HTMLElement;
    const hrefs = within(seccion)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/mi-cuenta/establecimientos",
      "/mi-cuenta/nueva-solicitud",
      "/mi-cuenta/expedientes",
      "/mi-cuenta/certificados",
    ]);
  });

  it("sin locales libres los accesos rápidos omiten Nueva solicitud", () => {
    render(
      <InicioClienteView
        inicio={{ ...vacio, pasos: [paso()], expedientes: { total: 1, enCurso: 1, finalizados: 0 }, establecimientos: conLocales(0, 1) }}
        saludo="Ana"
      />,
    );
    const seccion = screen.getByRole("heading", { name: "Accesos rápidos" }).closest("section") as HTMLElement;
    expect(within(seccion).getAllByRole("link")).toHaveLength(3);
  });
});
