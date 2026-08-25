"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Hash, Percent, Coins } from "lucide-react";
import { CURRENCIES } from "@/lib/money";
import { toast } from "@/components/toaster";

type SettingsShape = {
  businessName: string;
  logoText: string;
  address: string;
  defaultTaxRate: number;
  invoicePrefix: string;
  currency: string;
};

export function SettingsView({ initial }: { initial: SettingsShape }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [logoText, setLogoText] = useState(initial.logoText);
  const [businessName, setBusinessName] = useState(initial.businessName);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: f.get("businessName"),
          logoText: f.get("logoText"),
          address: f.get("address"),
          defaultTaxRate: Number(f.get("defaultTaxRate")),
          invoicePrefix: f.get("invoicePrefix"),
          currency: f.get("currency"),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(data.error || "Could not save settings", "error");
        return;
      }
      toast("Settings saved");
      router.refresh();
    } catch {
      toast("Network error", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="mt-0.5 text-sm text-ink-400">
          Your business profile — used on every invoice you send.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {/* profile */}
        <section className="surface p-5 sm:p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-semibold text-white">
            <Building2 size={17} className="text-emerald-soft" /> Business profile
          </h2>

          <div className="mt-5 flex items-center gap-4">
            <div
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#0ea86e,#10b981)" }}
            >
              {(logoText || businessName.charAt(0) || "B").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="logoText">Logo monogram (1–2 chars)</label>
              <input
                id="logoText"
                name="logoText"
                maxLength={2}
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                className="field w-28 uppercase"
                placeholder="BH"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="businessName">Business name</label>
              <input
                id="businessName"
                name="businessName"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="field"
                placeholder="Hasret Studio"
              />
            </div>
            <div>
              <label className="label" htmlFor="currency">Default currency</label>
              <select id="currency" name="currency" defaultValue={initial.currency} className="field">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="address">Address (shown on invoices)</label>
            <textarea
              id="address"
              name="address"
              rows={3}
              defaultValue={initial.address}
              className="field resize-none"
              placeholder={"Street & number\nCity, postcode\nCountry"}
            />
          </div>
        </section>

        {/* invoicing defaults */}
        <section className="surface p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-white">Invoice defaults</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label flex items-center gap-1.5" htmlFor="prefix">
                <Hash size={12} /> Invoice prefix
              </label>
              <input
                id="prefix"
                name="invoicePrefix"
                defaultValue={initial.invoicePrefix}
                className="field uppercase"
                placeholder="INV"
                maxLength={6}
              />
              <p className="mt-1.5 text-xs text-ink-500">
                Next number: <span className="font-mono">{initial.invoicePrefix}-{new Date().getFullYear()}-NNNN</span>
              </p>
            </div>
            <div>
              <label className="label flex items-center gap-1.5" htmlFor="tax">
                <Percent size={12} /> Default tax %
              </label>
              <input
                id="tax"
                name="defaultTaxRate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={initial.defaultTaxRate}
                className="field"
              />
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-ink-700 bg-ink-900/60 p-3.5 text-xs leading-relaxed text-ink-400">
            <Coins size={15} className="mt-0.5 shrink-0 text-gold" />
            New invoices pick up these defaults automatically; each invoice can still override
            tax and currency.
          </p>
        </section>

        <div className="flex justify-end pb-8">
          <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
