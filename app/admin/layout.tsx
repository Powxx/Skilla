import PortalHeaderShell from "@/components/portal/portal-header-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/30">
      <PortalHeaderShell variant="admin" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
