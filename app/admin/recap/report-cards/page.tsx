import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function AdminReportCardsRecapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [semesters, classes, students, reportCards] = await Promise.all([
    prisma.semester.findMany({ orderBy: { startDate: 'desc' } }),
    prisma.class.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ 
        where: { role: "STUDENT" }, 
        include: { class: true },
        orderBy: { lastName: 'asc' } 
    }),
    prisma.reportCard.findMany()
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Suivi des Bulletins</h1>
            <p className="mt-2 text-slate-500 font-medium">Visualisez l'état de validation des bulletins par élève et par semestre.</p>
          </div>
        </header>

        <div className="space-y-12">
          {semesters.map(semester => (
            <div key={semester.id} className="space-y-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest bg-white inline-block px-6 py-2 rounded-full border border-slate-200 shadow-sm">
                {semester.name}
              </h2>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {classes.map(cls => {
                  const classStudents = students.filter(s => s.classId === cls.id);
                  if (classStudents.length === 0) return null;

                  const validatedCount = classStudents.filter(s => 
                    reportCards.some(rc => rc.studentId === s.id && rc.semesterId === semester.id)
                  ).length;

                  return (
                    <div key={cls.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-900">{cls.name}</span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${validatedCount === classStudents.length ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {validatedCount} / {classStudents.length} PRÊTS
                        </span>
                      </div>
                      
                      <div className="p-5 flex-1 space-y-2">
                        {classStudents.map(student => {
                          const hasReport = reportCards.some(rc => rc.studentId === student.id && rc.semesterId === semester.id);
                          return (
                            <div key={student.id} className="flex justify-between items-center text-sm">
                              <span className={hasReport ? "text-slate-600 font-medium" : "text-red-500 font-bold"}>
                                {student.lastName} {student.firstName}
                              </span>
                              {hasReport ? (
                                <span className="text-emerald-500 font-bold text-[10px] uppercase">✓ Validé</span>
                              ) : (
                                <span className="text-red-400 font-bold text-[10px] uppercase tracking-tighter animate-pulse">En attente</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
