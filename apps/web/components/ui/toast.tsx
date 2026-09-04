"use client";

import * as React from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
}

/* ── Context ─────────────────────────────────────────────── */
const ToastContext = React.createContext<{
  toasts: ToastItem[];
  toast: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-success" />,
  error:   <AlertCircle className="h-4 w-4 text-error" />,
  warning: <AlertCircle className="h-4 w-4 text-warning" />,
  info:    <Info className="h-4 w-4 text-brand" />,
};

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 sm:bottom-8 sm:right-8">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-lg",
              "min-w-[280px] max-w-sm",
            )}
          >
            {icons[t.variant ?? "info"]}
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
