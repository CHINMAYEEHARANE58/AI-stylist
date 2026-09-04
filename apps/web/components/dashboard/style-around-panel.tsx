import { Shirt, Wand2 } from "lucide-react";

import { styleAroundLooks } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function StyleAroundPanel() {
  return (
    <Card className="rounded-[32px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Style around selected item</p>
          <h2 className="mt-3 font-display text-4xl">One item, four complete looks.</h2>
        </div>
        <Button>
          <Shirt className="h-4 w-4" />
          Selected: Black skirt
        </Button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {styleAroundLooks.map((look) => (
          <div key={look.aesthetic} className="rounded-[24px] bg-muted/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <Badge>{look.aesthetic}</Badge>
              <Wand2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-5 space-y-2">
              {look.items.map((item) => (
                <div key={item} className="rounded-2xl bg-background/80 px-4 py-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{look.why}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

