import type { ReactNode } from "react";
import PortalHeaderShell from "@/components/portal/portal-header-shell";

export default function ProfLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PortalHeaderShell variant="prof" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
