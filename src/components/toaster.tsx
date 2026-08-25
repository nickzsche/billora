"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export type Toast = { id: number; message: string; kind: "success" | "error" | "info" };

type Listener = (t: Toast) => void;
const listeners = new Set<Listener>();
let counter = 0;

/** Fire a toast from anywhere in client code. */
export function toast(message: string, kind: Toast["kind"] = "success") {
  const t = { id: ++counter, message, kind };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setToasts((prev) => [...prev.slice(-3), t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3200);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 no-print"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className={`pointer-events-auto flex w-full items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xl backdrop-blur-md ${
              t.kind === "success"
                ? "border-emerald-accent/40 bg-[#131a17]/95 text-emerald-soft"
                : t.kind === "error"
                  ? "border-red-400/40 bg-[#1a1214]/95 text-red-300"
                  : "border-ink-600 bg-ink-800/95 text-ink-100"
            }`}
          >
            {t.kind === "success" && <CheckCircle2 size={16} className="shrink-0" />}
            {t.kind === "error" && <AlertCircle size={16} className="shrink-0" />}
            {t.kind === "info" && <Info size={16} className="shrink-0" />}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
