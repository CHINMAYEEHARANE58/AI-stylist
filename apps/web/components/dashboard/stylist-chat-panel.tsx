"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Plus, Send, Sparkles, Trash2 } from "lucide-react";

import { stylistPrompts } from "@/lib/mock-data";
import { stylistApi, type StylistConversationSummaryApi, type StylistMessageApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function StylistChatPanel() {
  const [conversations, setConversations] = useState<StylistConversationSummaryApi[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StylistMessageApi[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendFailed, setSendFailed] = useState(false);

  async function openConversation(id: string) {
    setLoading(true);
    setError("");
    setSendFailed(false);
    try {
      const response = await stylistApi.getConversation(id);
      setSelectedId(response.data.id);
      setMessages(response.data.messages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this conversation.");
    } finally {
      setLoading(false);
    }
  }

  async function loadInitial() {
    setLoading(true);
    setError("");
    setSendFailed(false);
    try {
      const response = await stylistApi.listConversations();
      setConversations(response.data);
      if (response.data[0]) {
        const detail = await stylistApi.getConversation(response.data[0].id);
        setSelectedId(detail.data.id);
        setMessages(detail.data.messages);
      } else {
        setSelectedId(null);
        setMessages([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load stylist chats.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadInitial(); }, []);

  async function sendMessage() {
    const message = draft.trim();
    if (!message || sending || message.length > 1000) return;
    setSending(true);
    setError("");
    setSendFailed(false);
    let replySaved = false;
    try {
      const response = await stylistApi.chat(message, selectedId ?? undefined);
      setDraft("");
      setSelectedId(response.data.conversationId);
      const now = new Date().toISOString();
      setMessages((current) => [...current,
        { id: `pending-user-${now}`, role: "USER", content: message, result: null,
          provider: null, model: null, createdAt: now },
        { id: `pending-assistant-${now}`, role: "ASSISTANT", content: response.data.reply,
          result: response.data, provider: response.data.provider, model: response.data.model, createdAt: now },
      ]);
      replySaved = true;
      const [list, detail] = await Promise.all([
        stylistApi.listConversations(), stylistApi.getConversation(response.data.conversationId),
      ]);
      setConversations(list.data);
      setMessages(detail.data.messages);
    } catch (cause) {
      setError(replySaved ? "Your reply was saved, but the conversation could not refresh." :
        cause instanceof Error ? cause.message : "The stylist could not respond. Try again.");
      setSendFailed(!replySaved);
    } finally {
      setSending(false);
    }
  }

  async function removeConversation() {
    if (!selectedId || !window.confirm("Delete this stylist conversation and all its messages?")) return;
    setError("");
    try {
      await stylistApi.deleteConversation(selectedId);
      await loadInitial();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this conversation.");
    }
  }

  return (
    <Card className="rounded-[32px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">AI personal stylist chat</p>
          <h2 className="mt-3 font-display text-4xl">Ask like you would ask a stylist.</h2>
        </div>
        <Button variant="outline" disabled>
          <Sparkles className="h-4 w-4" />
          Wardrobe context on
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {stylistPrompts.map((prompt) => (
          <Button key={prompt} variant="outline" size="sm" onClick={() => setDraft(prompt)}>
            <MessageCircle className="h-4 w-4" />
            {prompt}
          </Button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); setMessages([]); setError(""); setSendFailed(false); }}>
          <Plus className="h-4 w-4" /> New chat
        </Button>
        {conversations.map((conversation) => (
          <Button key={conversation.id} variant={selectedId === conversation.id ? "secondary" : "outline"}
            size="sm" onClick={() => void openConversation(conversation.id)}>
            {conversation.title.length > 30 ? `${conversation.title.slice(0, 30)}…` : conversation.title}
          </Button>
        ))}
        {selectedId && (
          <Button variant="ghost" size="icon-sm" aria-label="Delete conversation" onClick={() => void removeConversation()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div aria-live="polite" className="mt-6 grid gap-4 lg:grid-cols-2">
        {loading ? <div role="status" className="rounded-[24px] bg-muted/70 p-5 text-sm">Loading your chats…</div> : null}
        {!loading && messages.length === 0 ? (
          <div className="rounded-[24px] bg-muted/70 p-5 text-sm text-muted-foreground">
            No messages yet. Ask about an occasion, your colors, or a piece in your wardrobe.
          </div>
        ) : null}
        {!loading && messages.map((entry) => (
          <div key={entry.id} className="rounded-[24px] bg-muted/70 p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {entry.role === "USER" ? "You" : entry.provider === "mock" ? "Stylist · development mock" : "AI stylist"}
            </p>
            <p className="mt-3 text-sm leading-6">{entry.content}</p>
            {entry.result?.outfits.map((outfit, index) => (
              <div key={`${outfit.title}-${index}`} className="mt-4 rounded-2xl border border-border bg-background/60 p-3">
                <p className="text-sm font-medium">{outfit.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{outfit.explanation}</p>
                <p className="mt-3 text-xs font-medium">From your wardrobe</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {outfit.items.map((item, itemIndex) => item ? (
                    <Link key={item.id} href={`/wardrobe/${item.id}`} className="rounded-xl border border-border px-2 py-1 text-xs hover:bg-accent">
                      {item.name}
                    </Link>
                  ) : <span key={`missing-${itemIndex}`} className="text-xs text-muted-foreground">Item no longer available</span>)}
                </div>
              </div>
            ))}
            {entry.result && entry.result.shoppingSuggestions.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-medium">Optional pieces to shop for · not in your wardrobe</p>
                {entry.result.shoppingSuggestions.map((idea) => (
                  <p key={idea.name} className="mt-1 text-xs text-muted-foreground">{idea.name}: {idea.reason}</p>
                ))}
              </div>
            )}
            {entry.result && entry.result.suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {entry.result.suggestions.map((suggestion) => (
                  <Button key={suggestion} variant="outline" size="xs" onClick={() => setDraft(suggestion)}>{suggestion}</Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <div role="alert" className="mt-4 rounded-xl border border-destructive/30 p-3 text-sm text-destructive">
        {error} <Button variant="link" size="xs" onClick={() => sendFailed ? void sendMessage() : selectedId ? void openConversation(selectedId) : void loadInitial()}>
          {sendFailed ? "Retry message" : "Retry loading"}
        </Button>
      </div>}
      <div className="mt-6 flex gap-3">
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000}
          onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }}
          placeholder="Ask about today's outfit, colors, travel, college, interview, or brunch..." />
        <Button size="icon" aria-label="Send stylist message" onClick={() => void sendMessage()} disabled={sending || !draft.trim()}>
          {sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {sending && <p role="status" className="mt-2 text-xs text-muted-foreground">Stylist is thinking…</p>}
    </Card>
  );
}
