"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { CURRENCIES } from "@/lib/money";
import { toast } from "@/components/toaster";
import type { Client } from "@/db/schema";

const FREE_CLIENT_LIMIT = 3;

export function ClientsView({ initial }: { initial: Client[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  // support /app/clients?new=1 deep link from empty state
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      openNew();
      router.replace("/app/clients");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  async function save(payload: Record<string, unknown>, id?: number) {
    setBusy(true);
    try {
      const res = await fetch(id ? `/api/clients/${id}` : "/api/clients", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; client?: Client };
      if (!res.ok) {
        toast(data.error || "Could not save client", "error");
        return false;
      }
      toast(id ? "Client updated" : "Client added");
      setShowForm(false);
      router.refresh();
      // optimistic local refresh
      if (data.client) {
        setRows((prev) => {
          const next = id
            ? prev.map((c) => (c.id === id ? (data.client as Client) : c))
            : [...prev, data.client as Client];
          return [...next].sort((a, b) => a.name.localeCompare(b.name));
        });
      }
      return true;
    } catch {
      toast("Network error", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Client) {
    if (!window.confirm(`Delete ${c.name}? Their invoices will also be removed.`)) return;
    try {
      const res = await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast(data.error || "Could not delete client", "error");
        return;
      }
      toast("Client deleted", "info");
      setRows((prev) => prev.filter((x) => x.id !== c.id));
      router.refresh();
    } catch {
      toast("Network error", "error");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Clients</h1>
          <p className="mt-0.5 text-sm text-ink-400">
            {rows.length} client{rows.length === 1 ? "" : "s"}
            {rows.length >= FREE_CLIENT_LIMIT && (
              <span className="ml-2 text-gold">· Free plan limit reached — upgrade for unlimited</span>
            )}
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus size={16} /> Add client
        </button>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3 }}
            className="surface surface-hover group p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{c.name}</div>
                {c.company && <div className="truncate text-xs text-ink-400">{c.company}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5 opacity-70 transition-opacity group-hover:opacity-100">
                <button
                  aria-label={`Edit ${c.name}`}
                  className="rounded-lg border border-ink-600 p-1.5 text-ink-300 hover:text-white"
                  onClick={() => {
                    setEditing(c);
                    setShowForm(true);
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  aria-label={`Delete ${c.name}`}
                  className="rounded-lg border border-ink-600 p-1.5 text-ink-300 hover:border-danger/50 hover:text-danger"
                  onClick={() => remove(c)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
              {c.email && <span>✉ {c.email}</span>}
              <span className="rounded border border-ink-600 px-1.5 py-0.5 font-semibold text-ink-300">
                {c.currency}
              </span>
            </div>
            {c.notes && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-400">{c.notes}</p>}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <ClientModal
            key={editing?.id ?? "new"}
            client={editing}
            busy={busy}
            onClose={() => setShowForm(false)}
            onSave={save}
            atLimit={!editing && rows.length >= FREE_CLIENT_LIMIT}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientModal({
  client,
  onClose,
  onSave,
  busy,
  atLimit,
}: {
  client: Client | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, id?: number) => Promise<boolean>;
  busy: boolean;
  atLimit: boolean;
}) {
  const [nag, setNag] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 no-print"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="surface max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">
            {client ? "Edit client" : atLimit ? "Free plan limit" : "New client"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-ink-600 p-1.5 text-ink-300 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {atLimit ? (
          <div className="text-sm leading-relaxed text-ink-300">
            <p>
              The free plan covers up to <strong className="text-gold">3 clients</strong>. Upgrading to
              Pro unlocks unlimited clients, recurring invoices and analytics.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-5 w-full"
              onClick={() => {
                setNag(true);
                toast("Checkout coming soon — Pro is a stub in this demo ✨", "info");
              }}
            >
              Upgrade to Pro{nag ? " ✨" : ""}
            </button>
            <button type="button" className="btn btn-ghost mt-2 w-full" onClick={onClose}>
              Maybe later
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await onSave(
                {
                  name: String(f.get("name") || "").trim(),
                  email: String(f.get("email") || "").trim(),
                  company: String(f.get("company") || "").trim(),
                  address: String(f.get("address") || "").trim(),
                  currency: String(f.get("currency") || "USD"),
                  notes: String(f.get("notes") || "").trim(),
                },
                client?.id,
              );
            }}
            className="flex flex-col gap-3.5"
          >
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="cname">Name *</label>
                <input id="cname" name="name" required defaultValue={client?.name} className="field" placeholder="Aylin Kaya" />
              </div>
              <div>
                <label className="label" htmlFor="ccompany">Company</label>
                <input id="ccompany" name="company" defaultValue={client?.company} className="field" placeholder="Northwind Commerce" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1fr_110px]">
              <div>
                <label className="label" htmlFor="cemail">Email</label>
                <input id="cemail" name="email" type="email" defaultValue={client?.email} className="field" placeholder="aylin@northwind.co" />
              </div>
              <div>
                <label className="label" htmlFor="ccurrency">Currency</label>
                <select id="ccurrency" name="currency" defaultValue={client?.currency ?? "USD"} className="field">
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="caddress">Address</label>
              <textarea id="caddress" name="address" rows={2} defaultValue={client?.address} className="field resize-none" placeholder="Street, city, country" />
            </div>
            <div>
              <label className="label" htmlFor="cnotes">Notes</label>
              <textarea id="cnotes" name="notes" rows={2} defaultValue={client?.notes} className="field resize-none" placeholder="Preferences, billing cycle…" />
            </div>
            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
                {busy ? "Saving…" : client ? "Save changes" : "Add client"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
