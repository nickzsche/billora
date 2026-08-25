import type { Metadata } from "next";
import { requireUser, getSettings } from "@/lib/data";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const s = await getSettings(user.id);

  return (
    <SettingsView
      initial={{
        businessName: s.businessName,
        logoText: s.logoText,
        address: s.address,
        defaultTaxRate: s.defaultTaxRate,
        invoicePrefix: s.invoicePrefix,
        currency: s.currency,
      }}
    />
  );
}
