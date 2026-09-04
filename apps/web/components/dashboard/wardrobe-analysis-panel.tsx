import { wardrobeAnalysis } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function WardrobeAnalysisPanel() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {wardrobeAnalysis.map((item) => (
        <Card key={item.label} className="rounded-3xl">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-label-sm">{item.label}</p>
            <Badge variant="accent" size="sm">{item.value}</Badge>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
        </Card>
      ))}
    </div>
  );
}
