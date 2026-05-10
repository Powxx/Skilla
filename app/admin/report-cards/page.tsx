import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ReportCardClient from "./report-card-client";

export const dynamic = 'force-dynamic';

export default async function AdminReportCardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [students, semesters] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } },
      orderBy: { lastName: 'asc' }
    }),
    prisma.semester.findMany({
      orderBy: { startDate: 'desc' }
    })
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Gestion des Bulletins</h1>
          <p className="mt-2 text-slate-500 font-medium">Générez et validez les livrets scolaires par semestre.</p>
        </header>

        <ReportCardClient 
          students={students.map(s => ({ id: s.id, name: `${s.lastName} ${s.firstName}`, className: s.class?.name || "N/A" }))} 
          semesters={semesters.map(s => ({ id: s.id, name: s.name }))}
        />
      </div>
    </div>
  );
}
