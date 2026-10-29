import { ClipboardCheck, BellRing, FileSearch, type LucideIcon } from "lucide-react"

export type HeroSlide = {
  id: string
  title: string
  text: string
  icon: LucideIcon
  image: { src: string; alt: string } | null
}

// Créditos de las imágenes en docs/creditos-imagenes.md.
export const heroSlides: HeroSlide[] = [
  {
    id: "tramita",
    title: "Tramita tu Certificado ITSE sin hacer colas",
    text: "Presenta tu solicitud y tus documentos en línea, desde tu celular o computadora.",
    icon: ClipboardCheck,
    image: {
      src: "/images/landing/hero-1.jpg",
      alt: "Tendero con delantal atendiendo a dos clientes en su tienda",
    },
  },
  {
    id: "seguimiento",
    title: "Sigue tu expediente en tiempo real",
    text: "Consulta en qué etapa está tu trámite y qué falta para completarlo.",
    icon: FileSearch,
    image: {
      src: "/images/landing/hero-2.jpg",
      alt: "Mujer sonriendo mientras escribe en una laptop en su casa",
    },
  },
  {
    id: "alertas",
    title: "Recibe alertas antes de que venza tu certificado",
    text: "Te avisamos con anticipación para que renueves a tiempo y evites sanciones.",
    icon: BellRing,
    image: {
      src: "/images/landing/hero-3.jpg",
      alt: "Letrero luminoso rojo de salida de emergencia en una pared",
    },
  },
]
