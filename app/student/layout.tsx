import PortalHeaderShell from "@/components/portal/portal-header-shell";
import PortalSidebar from "@/components/portal/portal-sidebar";
import { getGlobalSettings } from "@/app/actions/settings";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const settings = await getGlobalSettings();
  const schoolName = settings.SCHOOL_SHORT_NAME || settings.SCHOOL_NAME || "Skilla";

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <PortalSidebar variant="student" schoolName={schoolName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PortalHeaderShell variant="student" />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
