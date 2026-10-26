"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import Autoplay from "embla-carousel-autoplay"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { heroSlides } from "@/modules/landing/data/hero-slides"

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [plugins] = useState(() =>
    typeof window === "undefined" || prefersReducedMotion()
      ? []
      : [Autoplay({ delay: 5000, stopOnMouseEnter: true, stopOnInteraction: false })]
  )

  useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  return (
    <section
      aria-label="Presentación"
      className="bg-gradient-to-b from-brand/10 to-background pt-24 pb-12 md:pt-28"
    >
      <Carousel
        setApi={setApi}
        plugins={plugins}
        opts={{ loop: true }}
        className="mx-auto max-w-6xl px-4"
      >
        <CarouselContent>
          {heroSlides.map(({ id, title, text, icon: Icon, image }, i) => {
            const Title = i === 0 ? "h1" : "h2"
            return (
            <CarouselItem key={id} className="grid items-center gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <Title className="text-3xl font-bold tracking-tight text-brand md:text-4xl">
                  {title}
                </Title>
                <p className="text-muted-foreground">{text}</p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/sign-up"
                    className={cn(buttonVariants({ size: "lg" }), "bg-safety text-safety-foreground hover:bg-safety/90")}
                  >
                    Crear cuenta
                  </Link>
                  <Link href="#como-funciona" className={buttonVariants({ variant: "outline", size: "lg" })}>
                    Cómo funciona
                  </Link>
                </div>
              </div>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-brand to-brand/60">
                {image ? (
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                    priority={i === 0}
                  />
                ) : (
                  <Icon aria-hidden className="absolute inset-0 m-auto size-24 text-brand-foreground/80" />
                )}
              </div>
            </CarouselItem>
            )
          })}
        </CarouselContent>
        <div className="mt-6 flex items-center justify-center gap-4">
          <CarouselPrevious aria-label="Diapositiva anterior" className="static" />
          <div className="flex gap-2">
            {heroSlides.map(({ id }, i) => (
              <button
                key={id}
                type="button"
                aria-label={`Ir a la diapositiva ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  i === current ? "w-6 bg-brand" : "w-2.5 bg-brand/30"
                )}
              />
            ))}
          </div>
          <CarouselNext aria-label="Diapositiva siguiente" className="static" />
        </div>
      </Carousel>
    </section>
  )
}
