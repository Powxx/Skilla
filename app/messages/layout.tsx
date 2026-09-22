import PortalHeaderShell from "@/components/portal/portal-header-shell";
import PortalSidebar from "@/components/portal/portal-sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  let variant: "admin" | "prof" | "student" | "parent" | "employer" = "student";
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    variant = 'admin';
  } else if (role === 'TEACHER') {
    variant = 'prof';
  } else if (role === 'RESPONSIBLE') {
    variant = 'parent';
  } else if (role === 'COMPANY_TUTOR') {
    variant = 'employer';
  } else {
    variant = 'student';
  }

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
