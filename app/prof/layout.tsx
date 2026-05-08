import type { ReactNode } from "react";
import PortalHeaderShell from "@/components/portal/portal-header-shell";
import PortalSidebar from "@/components/portal/portal-sidebar";

export default function ProfLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <PortalSidebar variant="prof" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PortalHeaderShell variant="prof" />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
