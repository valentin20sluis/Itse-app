import type { Metadata } from "next"

import { BenefitsSection } from "@/modules/landing/components/BenefitsSection"
import { CtaSection } from "@/modules/landing/components/CtaSection"
import { FaqSection } from "@/modules/landing/components/FaqSection"
import { HeroCarousel } from "@/modules/landing/components/HeroCarousel"
import { HowItWorksSection } from "@/modules/landing/components/HowItWorksSection"
import { RiskLevelsSection } from "@/modules/landing/components/RiskLevelsSection"
import { SiteFooter } from "@/modules/landing/components/SiteFooter"
import { SiteHeader } from "@/modules/landing/components/SiteHeader"
import { VerifyCertificateSection } from "@/modules/landing/components/VerifyCertificateSection"
import { WhatIsItseSection } from "@/modules/landing/components/WhatIsItseSection"

export const metadata: Metadata = {
  title: "SIGITSE | Tramita tu Certificado ITSE en línea",
  description:
    "Conoce qué es la ITSE, cómo funciona el trámite y tu nivel de riesgo. Registra tu establecimiento, sigue tu expediente y verifica certificados en línea.",
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroCarousel />
        <WhatIsItseSection />
        <HowItWorksSection />
        <RiskLevelsSection />
        <BenefitsSection />
        <VerifyCertificateSection />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  )
}
