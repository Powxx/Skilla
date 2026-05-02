import type { ReactNode } from "react";
import PortalHeaderShell from "@/components/portal/portal-header-shell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PortalHeaderShell variant="student" />
      {children}
    </div>
  );
}
