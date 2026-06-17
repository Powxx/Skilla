import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import GradeGridClient from "./grade-grid-client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Saisie des notes — Professeur",
};

export default async function TeacherGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const teacherId = session.user.id;

  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      where: {
        lessons: { some: { teacherId, isFreeLesson: false } }
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: {
        lessons: { some: { teacherId, isFreeLesson: false } }
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // On prend la première matière pour l'exemple, à améliorer pour la sélection matière
  const subjectId = subjects.length > 0 ? subjects[0].id : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Gestion des notes
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Saisissez les notes en sélectionnant une classe.
        </p>
      </header>
      
      <GradeGridClient 
        classes={classes} 
        teacherId={teacherId}
        subjectId={subjectId}
      />
    </div>
  );
}
