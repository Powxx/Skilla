import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { listTutorStudentsSerialized } from "@/lib/employer-access";
import PortalHeaderShell from "@/components/portal/portal-header-shell";
import PortalSidebar from "@/components/portal/portal-sidebar";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  let studentList: { id: string; label: string }[] = [];

  if (session?.user?.id) {
    studentList = await listTutorStudentsSerialized(session.user.id);
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <PortalSidebar variant="employer" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PortalHeaderShell variant="employer" parentChildren={studentList} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
