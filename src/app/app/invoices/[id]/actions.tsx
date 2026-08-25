"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Printer, CheckCircle2, Send, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "@/components/toaster";

export function InvoiceActions({
  id,
  status,
  number,
}: {
  id: number;
  status: string;
  number: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function act(body: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(data.error || "Action failed", "error");
        return;
      }
      toast(successMsg);
      router.refresh();
    } catch {
      toast("Network error", "error");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function destroy() {
    if (!window.confirm(`Delete invoice ${number}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast("Could not delete invoice", "error");
        return;
      }
      toast("Invoice deleted", "info");
      router.push("/app/invoices");
      router.refresh();
    } catch {
      toast("Network error", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "paid" && (
        <button
          disabled={busy}
          onClick={() => act({ action: "mark-paid" }, `Payment recorded for ${number} 💰`)}
          className="btn btn-primary py-2 text-xs"
          title="Record payment & mark paid"
        >
          <CheckCircle2 size={14} /> Mark paid
        </button>
      )}
      {status === "draft" && (
        <button
          disabled={busy}
          onClick={() => act({ action: "send" }, `${number} marked as sent 📨`)}
          className="btn btn-ghost py-2 text-xs"
        >
          <Send size={14} /> Mark sent
        </button>
      )}

      <div className="relative">
        <button
          aria-label="More actions"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg border border-ink-600 p-2 text-ink-300 transition-colors hover:text-white"
        >
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && (
          <>
            {/* click-away layer */}
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="surface absolute right-0 z-50 mt-1.5 w-48 overflow-hidden p-1.5 shadow-2xl">
              <Link
                href={`/app/invoices/${id}/edit`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-white/5 hover:text-white"
              >
                <Pencil size={14} /> Edit
              </Link>
              <Link
                href={`/app/invoices/${id}/print`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-white/5 hover:text-white"
              >
                <Printer size={14} /> Print / PDF
              </Link>
              <button
                onClick={destroy}
                disabled={busy}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-400/10"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
