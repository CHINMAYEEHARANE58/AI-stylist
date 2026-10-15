"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CloudSun, RefreshCcw, Sparkles, Wand2, Calendar, Wind, Heart, ChevronRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FilterChips } from "@/components/ui/filter-chips";
import { OutfitCard } from "@/components/ui/outfit-card";
import { Badge } from "@/components/ui/badge";
import { ApiError, calendarApi, outfitsApi, weatherApi, type GeneratedOutfitApi, type WeatherApi, wardrobeApi } from "@/lib/api-client";
import type { OutfitSuggestion } from "@/lib/types";
import { occasions, moods, weatherOptions } from "@/lib/mock-data";

const SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All season"];
const COLOURS = ["Black", "White", "Ivory", "Beige", "Camel", "Brown", "Blue", "Green", "Red", "Pink", "Grey"];
const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : "Please try again.";
const localInput = (iso: string) => { const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };

export default function OutfitsPage() {
  const queryClient = useQueryClient();
  const [selectedOccasions, setOccasions] = useState<string[]>([]);
  const [selectedMoods, setMoods] = useState<string[]>([]);
  const [selectedWeather, setWeather] = useState<string[]>([]);
  const [selectedSeasons, setSeasons] = useState<string[]>([]);
  const [selectedColours, setColours] = useState<string[]>([]);
  const [anchorItemId, setAnchorItemId] = useState("");
  const [notes, setNotes] = useState("");
  const [generated, setGenerated] = useState<GeneratedOutfitApi[]>([]);
  const [generatedProvider, setGeneratedProvider] = useState<{ provider?: string; model?: string }>({});
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [useLiveWeather, setUseLiveWeather] = useState(false);
  const [weatherResult, setWeatherResult] = useState<WeatherApi | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [eventPage, setEventPage] = useState(1);

  const wardrobeQuery = useQuery({ queryKey: ["outfit-wardrobe"], queryFn: () => wardrobeApi.list({ perPage: 60 }) });
  const weatherQuery = useQuery({ queryKey: ["outfit-weather"], queryFn: () => weatherApi.current(), staleTime: 15 * 60_000 });
  const calendarQuery = useQuery({ queryKey: ["calendar-events", eventPage], queryFn: () => calendarApi.list(eventPage) });
  const wardrobe = wardrobeQuery.data?.data ?? [];
  const outfitKey = (outfit: GeneratedOutfitApi, index: number) => `${index}-${outfit.title}`;

  const generateMutation = useMutation({
    mutationFn: () => outfitsApi.generate({ occasion: selectedOccasions[0], aesthetic: selectedMoods[0], mood: selectedMoods[0], season: selectedSeasons[0], colorPreference: selectedColours[0], weather: selectedWeather[0], useWeather: useLiveWeather, notes: notes.trim() || undefined, anchorItemId: anchorItemId || undefined }),
    onSuccess: (result) => {
      setGenerated(result.data.outfits);
      setLastEventId(null);
      setGeneratedProvider({ provider: result.data.provider, model: result.data.model });
      setGenerationMessage(result.message);
      setWeatherResult(result.data.weather ?? null);
      setSavedKeys([]);
    },
  });
  const saveEventMutation = useMutation({
    mutationFn: () => {
      const startsAt = new Date(eventStart); const endsAt = new Date(eventEnd);
      if (!eventTitle.trim() || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) throw new Error("Enter a title, start and end time.");
      if (endsAt <= startsAt) throw new Error("End time must be after start time.");
      const input = { title: eventTitle.trim(), eventType: eventType.trim() || null,
        description: eventNotes.trim() || null, location: eventLocation.trim() || null,
        startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" };
      return editingEventId ? calendarApi.update(editingEventId, input) : calendarApi.create(input);
    },
    onSuccess: () => { setEventTitle(""); setEventType(""); setEventStart(""); setEventEnd("");
      setEventNotes(""); setEventLocation(""); setEditingEventId(null);
      void queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] }); },
  });
  const deleteEventMutation = useMutation({ mutationFn: (id: string) => calendarApi.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["calendar-events"] }) });
  const suggestEventMutation = useMutation({ mutationFn: (id: string) => calendarApi.suggest(id),
    onSuccess: (result, id) => { setGenerated(result.data.outfits); setLastEventId(id); setGeneratedProvider({ provider: result.data.provider, model: result.data.model });
      setGenerationMessage(result.message); setWeatherResult(result.data.weather ?? null); setSavedKeys([]); } });

  const saveMutation = useMutation({
    mutationFn: ({ outfit, index }: { outfit: GeneratedOutfitApi; index: number }) => outfitsApi.save({ title: outfit.title, clothingItemIds: outfit.clothingItemIds, occasion: outfit.occasion, aesthetic: outfit.aesthetic, season: outfit.season, weather: selectedWeather[0], explanation: outfit.explanation, source: "AI_GENERATED", provider: generatedProvider.provider, providerModel: generatedProvider.model }).then((result) => ({ result, index })),
    onSuccess: async ({ index }) => {
      setSavedKeys((keys) => [...keys, outfitKey(generated[index], index)]);
      await queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
    },
  });

  const toCard = (outfit: GeneratedOutfitApi, index: number): OutfitSuggestion => ({ id: outfitKey(outfit, index), title: outfit.title, mood: outfit.aesthetic, occasion: outfit.occasion, weather: weatherResult?.available ? weatherResult.condition : selectedWeather[0] ?? "No weather preference", items: outfit.clothingItems.map((item) => item.name), accent: "", notes: outfit.explanation, score: Math.round(outfit.score) });
  const reset = () => { setGenerated([]); setGenerationMessage(null); setSavedKeys([]); };

  return (
    <DashboardShell heading="AI Outfit Generator" subheading="Describe your moment and AI builds the perfect outfit from your wardrobe.">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-5">
            <p className="text-label-sm">Generator settings</p>
            <div><p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-brand" /> Occasion</p><FilterChips options={occasions} selected={selectedOccasions} onChange={setOccasions} multi={false} /></div>
            <div><p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-brand" /> Mood / aesthetic</p><FilterChips options={moods} selected={selectedMoods} onChange={setMoods} multi={false} /></div>
            <div><p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-brand" /> Season</p><FilterChips options={SEASONS} selected={selectedSeasons} onChange={setSeasons} multi={false} /></div>
            <div><p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-brand" /> Colour preference</p><FilterChips options={COLOURS} selected={selectedColours} onChange={setColours} multi={false} /></div>
            <div><p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"><CloudSun className="h-3.5 w-3.5 text-brand" /> Weather</p><FilterChips options={weatherOptions} selected={selectedWeather} onChange={setWeather} multi={false} /></div>
            <div><p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5 text-brand" /> Build around (optional)</p>{wardrobeQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading wardrobe…</p> : wardrobe.length === 0 ? <p className="text-xs text-muted-foreground">Add wardrobe items to choose an anchor.</p> : <div className="flex flex-wrap gap-1.5">{wardrobe.slice(0, 12).map((item) => <button key={item.id} type="button" onClick={() => setAnchorItemId(anchorItemId === item.id ? "" : item.id)} className={`rounded-xl border px-3 py-1.5 text-xs transition-all ${anchorItemId === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}>{item.name}</button>)}</div>}</div>
            <Textarea placeholder="Any extra notes… comfortable for walking, avoid showing arms, etc." value={notes} onChange={(event) => setNotes(event.target.value)} className="resize-none" />
            {generateMutation.isError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage(generateMutation.error)}</p>}
            <div className="flex gap-3"><Button className="flex-1 gap-2" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending} disabled={wardrobeQuery.isLoading || wardrobe.length < 2}><Sparkles className="h-4 w-4" />{generateMutation.isPending ? "Generating…" : "Generate outfits"}</Button><Button variant="outline" size="icon" onClick={reset} aria-label="Reset"><RefreshCcw className="h-4 w-4" /></Button></div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] p-5 dark:from-[#1a1410] dark:to-[#2e1f16]"><div className="flex items-center gap-2 mb-2"><CloudSun className="h-4 w-4 text-brand" /><p className="text-xs font-medium">Weather context</p></div><p className="text-display-sm mb-1">{weatherQuery.data?.data.available ? `${weatherQuery.data.data.temperatureC}°C · ${weatherQuery.data.data.city}` : "Weather unavailable"}</p><p className="text-xs text-muted-foreground">{weatherQuery.data?.data.available ? `${weatherQuery.data.data.condition}. Retrieved ${new Date(weatherQuery.data.data.retrievedAt).toLocaleString()} · Open-Meteo.` : weatherQuery.data?.data.available === false ? weatherQuery.data.data.reason : weatherQuery.isError ? "Weather could not be loaded." : "Loading weather…"}</p><label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={useLiveWeather} onChange={(event) => setUseLiveWeather(event.target.checked)} />Use live weather from my selected city for generation</label>{weatherResult?.available && <p className="mt-2 text-xs text-muted-foreground">Used {weatherResult.forecastFor ? `forecast for ${weatherResult.forecastFor}` : "current weather"}: {weatherResult.temperatureC}°C, {weatherResult.precipitationMm} mm precipitation. Retrieved {new Date(weatherResult.retrievedAt).toLocaleString()} · Open-Meteo.</p>}{weatherResult && !weatherResult.available && (useLiveWeather || lastEventId) && <p className="mt-2 text-xs text-muted-foreground">{weatherResult.reason}</p>}<div className="mt-3 flex items-center gap-2"><Wind className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-xs text-muted-foreground">No precise location is requested. Suggestions use your own wardrobe.</p></div></div>
        </div>
        <div><AnimatePresence mode="wait">{generated.length === 0 ? <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-muted/30 p-12 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted"><Sparkles className="h-7 w-7 text-muted-foreground" /></div><div><p className="text-display-sm mb-2">{generationMessage ?? "Your outfits will appear here"}</p><p className="text-sm text-muted-foreground max-w-xs">{wardrobe.length < 2 ? "Add at least two wardrobe items to create a complete look." : "Select preferences, then generate a look from your real wardrobe."}</p></div></motion.div> : <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><p className="text-sm font-medium">{generated.length} outfits generated</p><Badge variant="accent" size="sm"><Sparkles className="h-3 w-3" /> AI powered</Badge></div><Button variant="ghost" size="sm" onClick={() => lastEventId ? suggestEventMutation.mutate(lastEventId) : generateMutation.mutate()} disabled={generateMutation.isPending || suggestEventMutation.isPending} className="gap-1.5"><RefreshCcw className="h-3.5 w-3.5" /> Regenerate</Button></div>{saveMutation.isError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage(saveMutation.error)}</p>}<div className="grid gap-4 lg:grid-cols-2">{generated.map((outfit, index) => <OutfitCard key={outfitKey(outfit, index)} outfit={toCard(outfit, index)} isSaved={savedKeys.includes(outfitKey(outfit, index))} onToggleSave={() => { if (!savedKeys.includes(outfitKey(outfit, index))) saveMutation.mutate({ outfit, index }); }} index={index} />)}</div><div className="flex justify-center pt-2"><Button variant="outline" size="sm" asChild><Link href="/saved-outfits"><Heart className="h-3.5 w-3.5" /> View saved outfits<ChevronRight className="h-3.5 w-3.5" /></Link></Button></div></motion.div>}</AnimatePresence></div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" /><p className="text-label-sm">{editingEventId ? "Edit event" : "Add calendar event"}</p></div><p className="text-xs text-muted-foreground">Event times use your current device time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}.</p><div className="grid gap-3 sm:grid-cols-2"><Input label="Event title" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} /><Input label="Event type / occasion" value={eventType} onChange={(event) => setEventType(event.target.value)} /><Input label="Start" type="datetime-local" value={eventStart} onChange={(event) => setEventStart(event.target.value)} /><Input label="End" type="datetime-local" value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} /><Input label="Location (optional)" value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} /></div><Textarea placeholder="Notes (optional)" value={eventNotes} onChange={(event) => setEventNotes(event.target.value)} />{saveEventMutation.isError && <p role="alert" className="text-sm text-destructive">{saveEventMutation.error.message}</p>}<div className="flex gap-2"><Button onClick={() => saveEventMutation.mutate()} loading={saveEventMutation.isPending}>{editingEventId ? "Update event" : "Add event"}</Button>{editingEventId && <Button variant="outline" onClick={() => { setEditingEventId(null); setEventTitle(""); setEventType(""); setEventStart(""); setEventEnd(""); setEventNotes(""); setEventLocation(""); }}>Cancel</Button>}</div></div>
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" /><p className="text-label-sm">Your events</p></div>{calendarQuery.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading events…</p>}{calendarQuery.isError && <div role="alert" className="text-sm text-destructive">{calendarQuery.error.message}<Button variant="outline" size="sm" onClick={() => void calendarQuery.refetch()} className="ml-2">Retry</Button></div>}{calendarQuery.data?.data.length === 0 && <p className="text-sm text-muted-foreground">No events yet. Add one to plan a wardrobe outfit.</p>}{calendarQuery.data?.data.map((event) => <div key={event.id} className="rounded-2xl bg-muted/60 p-4"><p className="text-sm font-semibold">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.startsAt).toLocaleString()} · {event.timeZone}{event.eventType ? ` · ${event.eventType}` : ""}</p>{event.description && <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={new Date(event.startsAt) < new Date() || wardrobe.length < 2 || suggestEventMutation.isPending} onClick={() => suggestEventMutation.mutate(event.id)}>Suggest outfit</Button><Button size="sm" variant="ghost" onClick={() => { setEditingEventId(event.id); setEventTitle(event.title); setEventType(event.eventType ?? ""); setEventStart(localInput(event.startsAt)); setEventEnd(localInput(event.endsAt)); setEventNotes(event.description ?? ""); setEventLocation(event.location ?? ""); }}>Edit</Button><Button size="sm" variant="ghost" disabled={deleteEventMutation.isPending} onClick={() => { if (window.confirm("Delete this event?")) deleteEventMutation.mutate(event.id); }}>Delete</Button></div></div>)}{(deleteEventMutation.error || suggestEventMutation.error) && <p role="alert" className="text-sm text-destructive">{(deleteEventMutation.error ?? suggestEventMutation.error)?.message}</p>}{(calendarQuery.data?.meta.totalPages ?? 0) > 1 && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={eventPage === 1} onClick={() => setEventPage(eventPage - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={eventPage >= (calendarQuery.data?.meta.totalPages ?? 1)} onClick={() => setEventPage(eventPage + 1)}>Next</Button></div>}</div>
      </div>
    </DashboardShell>
  );
}
