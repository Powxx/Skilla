import PortalHeaderShell from "@/components/portal/portal-header-shell";
import PortalSidebar from "@/components/portal/portal-sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const variant = session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN' ? 'admin' : session.user.role.toLowerCase() as any;

  return (
    <div className="flex h-screen bg-slate-50/30 text-slate-900 overflow-hidden">
      <PortalSidebar variant={variant} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PortalHeaderShell variant={variant} />
        <main className="flex-1 overflow-hidden p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
