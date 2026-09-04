import { analytics } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";

export function AnalyticsPanel() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-[32px]">
        <p className="text-sm uppercase tracking-[0.26em] text-muted-foreground">AI style profile</p>
        <h2 className="mt-3 font-display text-4xl">Your wardrobe language, visualized.</h2>
        <div className="mt-8 space-y-6">
          {analytics.favoriteColors.map((entry) => (
            <div key={entry.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>{entry.label}</span>
                <span className="text-muted-foreground">{entry.value}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted">
                <div className="h-3 rounded-full bg-primary" style={{ width: `${entry.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6">
        <Card className="rounded-[32px]">
          <h3 className="font-display text-3xl">Dominant aesthetics</h3>
          <div className="mt-6 space-y-4">
            {analytics.aesthetics.map((entry) => (
              <div key={entry.label} className="rounded-[24px] bg-muted/70 p-4">
                <div className="flex items-center justify-between">
                  <span>{entry.label}</span>
                  <span className="text-sm text-muted-foreground">{entry.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-[32px]">
          <h3 className="font-display text-3xl">Wardrobe insights</h3>
          <div className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
            {analytics.habits.map((habit) => (
              <div key={habit} className="rounded-[22px] bg-muted/70 p-4">
                {habit}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="rounded-[32px] xl:col-span-2">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Fashion analytics dashboard</p>
        <h3 className="mt-3 font-display text-4xl">Usage, categories, and outfit history</h3>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Favorite clothing categories</p>
            <div className="mt-4 space-y-4">
              {analytics.categories.map((entry) => (
                <div key={entry.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{entry.label}</span>
                    <span className="text-muted-foreground">{entry.value}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted">
                    <div className="h-3 rounded-full bg-primary" style={{ width: `${entry.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Outfit history</p>
            <div className="mt-4 grid gap-3">
              {analytics.usageHistory.map((entry) => (
                <div key={entry.label} className="flex items-center justify-between rounded-[22px] bg-muted/70 p-4 text-sm">
                  <span>{entry.label}</span>
                  <span className="text-muted-foreground">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
