"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { removeDocumentoAction } from "@/modules/expedientes/actions/expediente.actions";
import type {
  ExpedienteDocumento,
  TipoDocumento,
} from "@/modules/expedientes/types/expediente.types";
import { validateArchivo } from "@/modules/expedientes/utils/archivo";

type Props = {
  expedienteId: string;
  tipo: TipoDocumento;
  etiqueta: string;
  obligatorio: boolean;
  documento: ExpedienteDocumento | undefined;
};

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const ERROR_SUBIDA = "No se pudo subir el archivo. Inténtalo de nuevo.";

export function DocumentoUploader({ expedienteId, tipo, etiqueta, obligatorio, documento }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [quitando, startQuitar] = useTransition();

  const { startUpload, isUploading } = useUploadThing("documentoExpediente", {
    onClientUploadComplete: () => router.refresh(),
    onUploadError: () => setError(ERROR_SUBIDA),
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const check = validateArchivo({ name: file.name, type: file.type, size: file.size });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    void startUpload([file], { expedienteId, tipo });
  };

  const quitar = () =>
    startQuitar(async () => {
      const result = await removeDocumentoAction(expedienteId, tipo);
      setConfirmando(false);
      if (result.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });

  const ocupado = isUploading || quitando;

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-words text-sm font-medium">{etiqueta}</span>
        <div className="flex gap-2">
          <Badge variant="outline">{obligatorio ? "Obligatorio" : "Opcional"}</Badge>
          <Badge variant={documento ? "secondary" : "outline"}>
            {documento ? "Subido" : "Pendiente"}
          </Badge>
        </div>
      </div>
      {documento && (
        <p className="break-all text-xs text-muted-foreground">{documento.nombreOriginal}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          aria-label={`Elegir archivo: ${etiqueta}`}
          onChange={onChange}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4"
          disabled={ocupado}
          onClick={() => inputRef.current?.click()}
        >
          {documento ? "Reemplazar archivo" : "Elegir archivo"}
        </Button>
        {documento && (
          <>
            <a
              href={`/api/documentos/${expedienteId}?tipo=${tipo}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}
            >
              Ver archivo
            </a>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              disabled={ocupado}
              onClick={() => setConfirmando(true)}
            >
              Quitar
            </Button>
          </>
        )}
      </div>
      <p aria-live="polite" className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
        {isUploading ? "Subiendo archivo…" : quitando ? "Quitando archivo…" : error}
      </p>
      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar este archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará &quot;{etiqueta}&quot; de tu solicitud. Podrás subir otro archivo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 px-4">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="h-11 px-4" disabled={quitando} onClick={quitar}>
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
