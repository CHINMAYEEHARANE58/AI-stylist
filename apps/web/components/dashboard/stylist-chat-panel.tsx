"use client";

import { MessageCircle, Send, Sparkles } from "lucide-react";

import { stylistPrompts, stylistReplies } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function StylistChatPanel() {
  return (
    <Card className="rounded-[32px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">AI personal stylist chat</p>
          <h2 className="mt-3 font-display text-4xl">Ask like you would ask a stylist.</h2>
        </div>
        <Button variant="outline">
          <Sparkles className="h-4 w-4" />
          Use wardrobe context
        </Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {stylistPrompts.map((prompt) => (
          <Button key={prompt} variant="outline" size="sm">
            <MessageCircle className="h-4 w-4" />
            {prompt}
          </Button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {stylistReplies.map((message) => (
          <div key={message.prompt} className="rounded-[24px] bg-muted/70 p-5">
            <p className="text-sm font-medium">{message.prompt}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{message.reply}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <Input placeholder="Ask about today's outfit, colors, travel, college, interview, or brunch..." />
        <Button size="icon" aria-label="Send stylist message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

