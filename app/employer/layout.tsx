import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { listTutorStudentsSerialized } from "@/lib/employer-access";
import PortalHeaderShell from "@/components/portal/portal-header-shell";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  let studentList: { id: string; label: string }[] = [];

  if (session?.user?.id) {
    studentList = await listTutorStudentsSerialized(session.user.id);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PortalHeaderShell variant="employer" parentChildren={studentList} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
