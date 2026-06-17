import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import GradeEntryClient from "./grade-entry-client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Saisie des notes — Professeur",
};

export default async function TeacherGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const teacherId = session.user.id;

  const [classes, subjects, teacherGrades, semesters] = await Promise.all([
    prisma.class.findMany({
      where: {
        lessons: { some: { teacherId } }
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: {
        lessons: { some: { teacherId } }
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.grade.findMany({
      where: { teacherId },
      include: {
        student: {
          select: { firstName: true, lastName: true, class: { select: { name: true } } }
        },
        semester: true
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.semester.findMany({
      orderBy: { startDate: 'asc' }
    })
  ]);

  return (
    <>
      <div className="border-b border-slate-200/90 bg-white/90 backdrop-blur-sm mb-8">
        <div className="mx-auto max-w-5xl py-3 px-4 text-sm text-slate-600 flex justify-between items-center">
          <div>
            <span className="text-slate-500 font-medium">Parcours :</span>{" "}
            Saisie rapide → Consultation par trimestre → Modification
          </div>
          <div className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">
            {teacherGrades.length} notes au total
          </div>
        </div>
      </div>
      
      <GradeEntryClient 
        classes={classes} 
        subjects={subjects} 
        initialGrades={JSON.parse(JSON.stringify(teacherGrades))} 
        semesters={JSON.parse(JSON.stringify(semesters))}
      />
    </>
  );
}
