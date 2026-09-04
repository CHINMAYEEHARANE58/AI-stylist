import { comparisonRows } from "@/lib/mock-data";
import { currency } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function PriceComparisonTable() {
  return (
    <Card className="overflow-hidden rounded-[32px] p-0">
      <div className="border-b border-border/60 p-6">
        <p className="text-sm uppercase tracking-[0.26em] text-muted-foreground">Price comparison</p>
        <h2 className="mt-3 font-display text-4xl">Find the best buy in one glance.</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/70 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Store</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4 font-medium">Rating</th>
              <th className="px-6 py-4 font-medium">Discount</th>
              <th className="px-6 py-4 font-medium">Availability</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.store} className="border-t border-border/60">
                <td className="px-6 py-4">{row.store}</td>
                <td className="px-6 py-4">{currency(row.price)}</td>
                <td className="px-6 py-4">{row.rating}</td>
                <td className="px-6 py-4">{row.discount}%</td>
                <td className="px-6 py-4">{row.availability}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

