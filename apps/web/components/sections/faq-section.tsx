"use client";

import { motion } from "framer-motion";
import { faqs } from "@/lib/mock-data";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  return (
    <section className="container-page py-20 sm:py-28">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-label-md mb-3">FAQ</p>
          <h2 className="text-display-xl text-balance">
            Questions we get asked a lot.
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Can't find what you're looking for? Reach out to our team — we reply within a business day.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-0">
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
