"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, RefreshCcw, ShoppingBag } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { shoppingApi, type ShoppingOfferApi } from "@/lib/api-client";
import { currency } from "@/lib/utils";

function attributeLabels(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    const values = Array.isArray(entry) ? entry.filter((item): item is string => typeof item === "string")
      : typeof entry === "string" ? [entry] : [];
    if (!values.length) return [];
    return [`${key.replace(/([A-Z])/g, " $1")}: ${values.slice(0, 5).join(", ")}`];
  });
}

function OfferRow({ offer }: { offer: ShoppingOfferApi }) {
  const stale = offer.freshness === "stale";
  return <tr className="border-b border-border/40 last:border-0">
    <td className="py-3.5 pr-3 font-medium">{offer.store}</td>
    <td className="py-3.5 pr-3 font-semibold">{currency(offer.price, offer.currency)}</td>
    <td className="py-3.5 pr-3"><Badge variant={stale ? "warning" : "muted"} size="sm">
      {stale ? "Old observation" : offer.availability ?? "Availability unconfirmed"}
    </Badge></td>
    <td className="py-3.5 pr-3 text-xs text-muted-foreground">
      <time dateTime={offer.observedAt}>{new Date(offer.observedAt).toLocaleString()}</time>
    </td>
    <td className="py-3.5 text-right">{offer.canBuy && <Button size="xs" variant="outline" asChild>
      <a href={offer.url} target="_blank" rel="noopener noreferrer">Merchant <ArrowUpRight className="h-3 w-3" /></a>
    </Button>}</td>
  </tr>;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["shopping-product", id], queryFn: () => shoppingApi.details(id), retry: false });
  const refresh = useMutation({ mutationFn: () => shoppingApi.refreshOffers(id), onSuccess: async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["shopping-product", id] }),
      queryClient.invalidateQueries({ queryKey: ["shopping"] })]);
  } });
  const product = query.data?.data;
  const currencies = Array.from(new Set(product?.offers.map((offer) => offer.currency) ?? []));

  return <DashboardShell heading="Product details" subheading="Product information and observed merchant offers.">
    <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
      <Link href="/shopping"><ArrowLeft className="h-4 w-4" /> Back to shopping</Link>
    </Button>
    {query.isPending ? <div role="status" className="rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">Loading product details…</div>
      : query.isError || !product ? <EmptyState icon={<ShoppingBag />} title="Product unavailable"
        description={query.error?.message ?? "This product could not be found."}
        action={{ label: "Try again", onClick: () => void query.refetch() }} />
      : <>
        <div className="grid overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card lg:grid-cols-[minmax(0,360px)_1fr]">
          <div className="relative min-h-[260px] bg-muted">
            <Image src={product.imageUrl ?? "/shopping-1.svg"} alt={product.name} fill
              unoptimized className="object-cover" />
          </div>
          <div className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              {product.isSample && <Badge variant="warning">Sample catalog</Badge>}
              {!product.available && <Badge variant="warning">Unavailable</Badge>}
              {product.category && <Badge variant="muted">{product.category}</Badge>}
            </div>
            <div><h2 className="text-display-md">{product.name}</h2>
              {product.brand && <p className="mt-1 text-sm text-muted-foreground">{product.brand}</p>}</div>
            {product.description && <p className="text-sm leading-6 text-muted-foreground">{product.description}</p>}
            {attributeLabels(product.attributes).length > 0 && <div className="flex flex-wrap gap-2">
              {attributeLabels(product.attributes).map((label) => <Badge key={label} variant="muted" size="sm">{label}</Badge>)}
            </div>}
            <p className="text-xs text-muted-foreground">Catalog details updated {new Date(product.updatedAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-label-sm mb-1">Price comparison</p>
              <h3 className="text-display-md">Merchant offers</h3>
              <p className="mt-2 text-sm text-muted-foreground">Prices are observations at the times shown, not guaranteed checkout prices. Currencies are never converted or ranked against each other.</p>
            </div>
            {product.canRefresh && <Button variant="outline" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
              <RefreshCcw className="h-4 w-4" /> {refresh.isPending ? "Checking…" : "Check offers"}
            </Button>}
          </div>
          {refresh.isError && <p role="alert" className="mb-4 text-sm text-destructive">{refresh.error.message} <Button variant="ghost" size="sm" onClick={() => refresh.mutate()}>Retry</Button></p>}
          {product.offers.length === 0 ? <EmptyState icon={<ShoppingBag />} title="No verified offers"
            description={product.isSample ? "This development-only sample has no merchant, price, or purchase link."
              : "No authorized offer data is available for this product yet."} />
            : <div className="space-y-6">{currencies.map((code) => <div key={code}>
              <p className="mb-2 text-sm font-semibold">{code} offers</p>
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b border-border/60 text-left text-label-xs">
                  <th className="pb-3 pr-3">Merchant</th><th className="pb-3 pr-3">Observed price</th>
                  <th className="pb-3 pr-3">Status</th><th className="pb-3 pr-3">Last observed</th><th className="pb-3" />
                </tr></thead>
                <tbody>{product.offers.filter((offer) => offer.currency === code).map((offer) => <OfferRow key={offer.id} offer={offer} />)}</tbody>
              </table></div>
            </div>)}</div>}
        </div>
      </>}
  </DashboardShell>;
}
