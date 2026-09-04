import { CheckCircle2 } from "lucide-react";

import { featureCoverage } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";

export function FeatureCoveragePanel() {
  return (
    <Card className="rounded-[32px]">
      <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Project coverage</p>
      <h2 className="mt-3 font-display text-4xl">All requested ClosetAI modules are represented.</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {featureCoverage.map((feature) => (
          <div key={feature} className="flex gap-3 rounded-[22px] bg-muted/70 p-4 text-sm leading-6 text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
