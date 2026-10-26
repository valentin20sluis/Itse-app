import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-bold">SIGITSE</span>
        <span className="text-[0.65rem] text-muted-foreground">
          Sistema de Gestión de ITSE
        </span>
      </span>
    </span>
  )
}
