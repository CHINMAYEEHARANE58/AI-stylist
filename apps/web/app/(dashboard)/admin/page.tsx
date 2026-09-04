"use client";

import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, CheckCircle2, RefreshCcw, TrendingDown, TrendingUp, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item    = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const STATS = [
  { label: "Registered users",         value: "4,281",  trend: +12, icon: Users    },
  { label: "Daily active users",       value: "812",    trend: +8,  icon: BarChart3 },
  { label: "Pending moderation flags", value: "129",    trend: -3,  icon: AlertTriangle },
  { label: "Recommendation CTR",       value: "67%",    trend: +5,  icon: TrendingUp },
];

export default function AdminPage() {
  return (
    <DashboardShell
      heading="Admin Dashboard"
      subheading="Monitor users, content moderation, recommendation quality, and platform health."
    >
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Stats */}
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ label, value, trend, icon: Icon }) => (
            <div key={label} className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
              <div className="flex items-start justify-between mb-3">
                <Icon className="h-5 w-5 text-brand" />
                <span className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? "text-success" : "text-destructive"}`}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend)}%
                </span>
              </div>
              <p className="text-display-md">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div variants={item} className="grid gap-5 lg:grid-cols-2">
          {/* Content moderation */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-5">
              <p className="text-display-sm">Content moderation</p>
              <Badge variant="warning">3 pending</Badge>
            </div>
            <div className="space-y-3">
              {[
                { msg: "3 wardrobe uploads need manual image quality review.", status: "pending" },
                { msg: "2 shopping recommendations flagged for stale pricing.", status: "pending" },
                { msg: "1 Pinterest import validated — cleared for processing.", status: "ok" },
              ].map((i) => (
                <div key={i.msg} className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4">
                  {i.status === "ok"
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  }
                  <p className="text-sm leading-5 text-muted-foreground">{i.msg}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation quality */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-5">
              <p className="text-display-sm">Recommendation quality</p>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <RefreshCcw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Match accuracy",     value: 92 },
                { label: "Style AI confidence",value: 87 },
                { label: "CTR on suggestions", value: 67 },
                { label: "User satisfaction",  value: 94 },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-muted-foreground">{value}%</span>
                  </div>
                  <Progress value={value} className="h-2" indicatorClassName="bg-brand" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "User management",   detail: "Review account status, profile completion, Google auth adoption, and retention cohorts." },
            { title: "Analytics",         detail: "Track content volume, outfit generations, saves, shares, and shopping click-throughs." },
            { title: "Model operations",  detail: "Monitor tagging confidence, similarity scores, recommendation quality, and rating feedback." },
          ].map(({ title, detail }) => (
            <div key={title} className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
              <p className="text-display-sm mb-2">{title}</p>
              <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </DashboardShell>
  );
}
