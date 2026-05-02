import prisma from "@/lib/prisma";
import GradeEntryClient from "./grade-entry-client";

export const metadata = {
  title: "Saisie des notes — Professeur",
};

export default async function TeacherGradesPage() {
  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <div className="border-b border-slate-200/90 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 text-sm text-slate-600 sm:px-6 lg:px-8">
          <span className="text-slate-500">Étape 1 → 2 → 3 :</span>{" "}
          matière depuis la base, puis classe, puis élève — la saisie s’affiche ensuite.
        </div>
      </div>
      <GradeEntryClient classes={classes} subjects={subjects} />
    </>
  );
}
