import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import SanctionsProfClient from "./sanctions-prof-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sanctions — Espace Enseignant",
};

export default async function ProfSanctionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacherId = session.user.id;

  // Find classes taught by this teacher to filter students
  const teacherLessons = await prisma.lesson.findMany({
    where: { teacherId, isFreeLesson: false },
    select: { classId: true },
  });
  const classIds = Array.from(new Set(teacherLessons.map((l) => l.classId)));

  let studentsQuery: any = {
    role: "STUDENT",
    isActive: true,
  };

  if (classIds.length > 0) {
    studentsQuery.classId = { in: classIds };
  }

  const [students, sanctionTypes, sanctionsGiven] = await Promise.all([
    prisma.user.findMany({
      where: studentsQuery,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.sanctionType.findMany({
      where: { allowTeacher: true },
      orderBy: { name: "asc" },
    }),
    prisma.sanction.findMany({
      where: { givenById: teacherId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { id: true, name: true } },
          },
        },
        sanctionType: true,
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const formattedStudents = students.map((s) => ({
    id: s.id,
    name: `${s.lastName} ${s.firstName}`,
    className: s.class?.name || "Sans classe",
  }));

  return (
    <div className="min-h-[80vh] flex flex-col gap-6 font-sans text-slate-900 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase tracking-widest">
            Mes Sanctions Données
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Attribuez des sanctions aux élèves de vos classes et suivez leur historique.
          </p>
        </div>
      </header>

      <SanctionsProfClient
        students={formattedStudents}
        sanctionTypes={sanctionTypes}
        initialSanctions={sanctionsGiven as any}
      />
    </div>
  );
}
