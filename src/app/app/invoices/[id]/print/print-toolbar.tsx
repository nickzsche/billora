"use client";

import { Printer, ArrowLeft } from "lucide-react";

/** Floating toolbar for the print view. Hidden in print output via .no-print */
export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur-md">
      <a href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-300 transition-colors hover:text-white">
        <ArrowLeft size={15} /> Back to invoice
      </a>
      <button onClick={() => window.print()} className="btn btn-primary py-2 text-xs">
        <Printer size={14} /> Download PDF
      </button>
    </div>
  );
}
