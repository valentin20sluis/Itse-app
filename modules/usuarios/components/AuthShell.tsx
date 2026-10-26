import { Logo } from "@/components/shared/Logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-brand/15 via-brand/5 to-background px-4 py-8 text-foreground lg:flex-row lg:justify-between lg:gap-16 lg:px-24">
      <div className="flex flex-col items-center gap-4 text-center lg:flex-1 lg:items-start lg:text-left">
        <Logo className="origin-center scale-125 lg:origin-left lg:scale-150" />
        <p className="hidden max-w-sm text-muted-foreground lg:mt-6 lg:block">
          Tramita tu Certificado ITSE en línea y sigue tu expediente sin hacer colas.
        </p>
      </div>
      <div className="flex w-full justify-center lg:flex-1 lg:justify-end">{children}</div>
    </main>
  );
}
