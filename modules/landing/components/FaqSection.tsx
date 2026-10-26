import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "@/modules/landing/data/faq";

export function FaqSection() {
  return (
    <section id="preguntas-frecuentes" className="scroll-mt-20 bg-background py-16">
      <Reveal className="mx-auto max-w-3xl px-4">
        <SectionHeader
          title="Preguntas frecuentes"
          subtitle="Resolvemos las dudas más comunes sobre la ITSE."
        />
        <Accordion>
          {faqItems.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="py-4 text-base">{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
