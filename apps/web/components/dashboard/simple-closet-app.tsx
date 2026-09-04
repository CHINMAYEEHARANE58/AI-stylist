"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Bot, CheckCircle2, CloudSun, Loader2, Plus, Send, Shirt, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type WardrobeItem = {
  id: string;
  name: string;
  image: string;
  color?: string;
  type?: string;
  category?: string;
  style?: string;
};

type Outfit = {
  id: string;
  title: string;
  occasion: string;
  weather: string;
  mood: string;
  notes: string;
  itemIds?: string[];
  items?: string[];
};

type WardrobeResponse = {
  items: WardrobeItem[];
};

type OutfitResponse = {
  outfits: Outfit[];
};

type HealthResponse = {
  status: string;
  service: string;
};

type ChatResponse = {
  response: string;
  suggestions: string[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${path}`);
  }

  return response.json();
}

export function SimpleClosetApp() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [chat, setChat] = useState<ChatResponse | null>(null);
  const [occasion, setOccasion] = useState("Office");
  const [newItem, setNewItem] = useState("");
  const [message, setMessage] = useState("What should I wear today?");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [healthData, wardrobeData, outfitData] = await Promise.all([
          api<HealthResponse>("/health"),
          api<WardrobeResponse>("/wardrobe"),
          api<OutfitResponse>("/outfits"),
        ]);

        setHealth(healthData);
        setItems(wardrobeData.items);
        setOutfit(outfitData.outfits[0] ?? null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not reach the backend.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function generateOutfit() {
    setBusyAction("generate");
    setError("");

    try {
      const data = await api<OutfitResponse>("/outfits/generate", {
        method: "POST",
        body: JSON.stringify({
          occasion,
          weather: "29°C, humid with light rain",
          anchorItem: items[0]?.name,
        }),
      });

      setOutfit(data.outfits[0] ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate outfit.");
    } finally {
      setBusyAction(null);
    }
  }

  async function addItem() {
    if (!newItem.trim()) return;
    setBusyAction("add");
    setError("");

    try {
      const data = await api<{ item: WardrobeItem }>("/wardrobe", {
        method: "POST",
        body: JSON.stringify({
          name: newItem,
          image: "/wardrobe-item-1.svg",
          color: "Auto detected",
          type: "AI tagged",
          style: "Analyzing",
        }),
      });

      setItems((current) => [data.item, ...current]);
      setNewItem("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not add wardrobe item.");
    } finally {
      setBusyAction(null);
    }
  }

  async function askStylist() {
    setBusyAction("chat");
    setError("");

    try {
      const data = await api<ChatResponse>("/stylist/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      setChat(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reach stylist chat.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">ClosetAI</p>
            <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">Your closet, made easy.</h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            <span>{health ? `${health.service} online` : "Checking backend"}</span>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CloudSun className="h-4 w-4" />
                  Today
                </div>
                <h2 className="mt-2 font-display text-3xl">Generate an outfit</h2>
              </div>
              <Badge>Backend powered</Badge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="Occasion" />
              <Button onClick={generateOutfit} disabled={busyAction === "generate"}>
                {busyAction === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
              </Button>
            </div>

            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
              {outfit ? (
                <>
                  <p className="text-sm text-muted-foreground">{outfit.occasion} · {outfit.weather}</p>
                  <h3 className="mt-2 font-display text-3xl">{outfit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{outfit.notes}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(outfit.items ?? outfit.itemIds ?? ["Ivory blouse", "Black skirt", "Cream sneakers"]).map((item) => (
                      <Badge key={item}>{item}</Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Generate an outfit to see the backend response here.</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Bot className="h-4 w-4" />
              Stylist chat
            </div>
            <h2 className="mt-2 font-display text-3xl">Ask one simple question</h2>
            <div className="mt-5 flex gap-2">
              <Input value={message} onChange={(event) => setMessage(event.target.value)} />
              <Button size="icon" onClick={askStylist} disabled={busyAction === "chat"} aria-label="Ask stylist">
                {busyAction === "chat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              {chat?.response ?? "Try: What should I wear today? The answer will come from the backend stylist endpoint."}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Upload className="h-4 w-4" />
              Wardrobe
            </div>
            <h2 className="mt-2 font-display text-3xl">Add something you own</h2>
            <div className="mt-5 flex gap-2">
              <Input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Example: white linen shirt" />
              <Button size="icon" onClick={addItem} disabled={busyAction === "add"} aria-label="Add wardrobe item">
                {busyAction === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This calls `POST /api/wardrobe` and returns AI tags from the backend.
            </p>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((item) => (
              <Card key={item.id ?? item.name} className="overflow-hidden p-0">
                <Image
                  src={item.image || "/wardrobe-item-1.svg"}
                  alt={item.name}
                  width={400}
                  height={420}
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shirt className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.color ?? "Auto color"} · {item.type ?? item.category ?? "Tagged"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
