"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StylistChatPanel } from "@/components/dashboard/stylist-chat-panel";

export default function StylistPage() {
  return (
    <DashboardShell heading="AI Chat Stylist" subheading="Ask for outfit ideas grounded in the clothes you own.">
      <StylistChatPanel />
    </DashboardShell>
  );
}
