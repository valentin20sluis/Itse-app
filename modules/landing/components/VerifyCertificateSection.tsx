"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Reveal } from "@/components/shared/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildVerifyPath } from "@/modules/landing/utils/build-verify-path";

export function VerifyCertificateSection() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const path = buildVerifyPath(code);
    if (!path) {
      setError(true);
      return;
    }
    setError(false);
    router.push(path);
  }

  return (
    <section id="verificar-certificado" className="px-4 py-16 sm:px-6 lg:py-20">
      <Reveal className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
        <h2 className="text-2xl font-bold text-brand sm:text-3xl">
          Verifica un certificado
        </h2>
        <p className="mt-3 text-muted-foreground">
          Ingresa el código del certificado ITSE para comprobar que es auténtico.
        </p>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 flex flex-col gap-3 text-left sm:flex-row sm:items-start"
        >
          <div className="flex-1">
            <label htmlFor="certificate-code" className="sr-only">
              Código del certificado
            </label>
            <Input
              id="certificate-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código del certificado"
              autoComplete="off"
              aria-invalid={error}
              aria-describedby={error ? "certificate-code-error" : undefined}
              className="h-11 px-3"
            />
            {error && (
              <p
                id="certificate-code-error"
                role="alert"
                className="mt-2 text-sm text-destructive"
              >
                Ingresa el código de tu certificado.
              </p>
            )}
          </div>
          <Button type="submit" size="lg" className="h-11 px-6 text-base">
            Verificar
          </Button>
        </form>
      </Reveal>
    </section>
  );
}
