import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startUpload: vi.fn(),
  refresh: vi.fn(),
  removeDocumentoAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/uploadthing", () => ({
  useUploadThing: () => ({ startUpload: mocks.startUpload, isUploading: false }),
}));
vi.mock("@/modules/expedientes/actions/expediente.actions", () => ({
  removeDocumentoAction: mocks.removeDocumentoAction,
}));

import type { ExpedienteDocumento } from "@/modules/expedientes/types/expediente.types";
import { DocumentoUploader } from "./DocumentoUploader";

const EXP_ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const documento = { id: "d1", tipo: "FICHA_RUC", nombreOriginal: "ruc.pdf" } as unknown as ExpedienteDocumento;

function renderUploader(doc?: ExpedienteDocumento) {
  return render(
    <ul>
      <DocumentoUploader
        expedienteId={EXP_ID}
        tipo="FICHA_RUC"
        etiqueta="Ficha RUC"
        obligatorio
        documento={doc}
      />
    </ul>,
  );
}

function elegir(file: File) {
  fireEvent.change(screen.getByLabelText(/Elegir archivo: Ficha RUC/), { target: { files: [file] } });
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("DocumentoUploader", () => {
  it("un .exe muestra el mensaje y no sube", () => {
    renderUploader();
    elegir(new File(["x"], "virus.exe", { type: "application/x-msdownload" }));
    expect(screen.getByText(/Tipo de archivo no permitido/)).toBeTruthy();
    expect(mocks.startUpload).not.toHaveBeenCalled();
  });

  it("un PDF mayor a 8 MB muestra el mensaje y no sube", () => {
    renderUploader();
    const grande = new File(["x"], "grande.pdf", { type: "application/pdf" });
    Object.defineProperty(grande, "size", { value: 9 * 1024 * 1024 });
    elegir(grande);
    expect(screen.getByText("El PDF no puede superar 8 MB.")).toBeTruthy();
    expect(mocks.startUpload).not.toHaveBeenCalled();
  });

  it("un PDF válido llama a la subida con expedienteId y tipo", () => {
    renderUploader();
    const pdf = new File(["x"], "ruc.pdf", { type: "application/pdf" });
    elegir(pdf);
    expect(mocks.startUpload).toHaveBeenCalledWith([pdf], { expedienteId: EXP_ID, tipo: "FICHA_RUC" });
  });

  it("con documento muestra Subido y Ver archivo", () => {
    renderUploader(documento);
    expect(screen.getByText("Subido")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Ver archivo" });
    expect(link.getAttribute("href")).toBe(`/api/documentos/${EXP_ID}?tipo=FICHA_RUC`);
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("Quitar pide confirmación antes de borrar", async () => {
    mocks.removeDocumentoAction.mockResolvedValue({ ok: true, data: { id: "d1" } });
    renderUploader(documento);
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(await screen.findByText("¿Quitar este archivo?")).toBeTruthy();
    expect(mocks.removeDocumentoAction).not.toHaveBeenCalled();
    const botones = screen.getAllByRole("button", { name: "Quitar" });
    fireEvent.click(botones[botones.length - 1]);
    await waitFor(() => expect(mocks.removeDocumentoAction).toHaveBeenCalledWith(EXP_ID, "FICHA_RUC"));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });
});
