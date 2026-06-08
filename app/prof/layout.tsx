import type { ReactNode } from "react";
import PortalHeaderShell from "@/components/portal/portal-header-shell";
import PortalSidebar from "@/components/portal/portal-sidebar";
import { getGlobalSettings } from "@/app/actions/settings";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const settings = await getGlobalSettings() || [];

  const getSetting = (key: string) => settings.find(s => s.key === key)?.value;
  const schoolName = getSetting("SCHOOL_SHORT_NAME") || getSetting("SCHOOL_NAME") || "Skilla";

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <PortalSidebar variant="prof" schoolName={schoolName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PortalHeaderShell variant="prof" />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
