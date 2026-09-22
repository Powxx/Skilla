import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import GradeEntryClient from "./grade-entry-client";
import { getEffectiveTeacherId } from "@/lib/teacher-utils";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Saisie des notes — Professeur",
};

export default async function TeacherGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const teacherId = await getEffectiveTeacherId(session.user.id);

  let [classes, classSubjectLessons, teacherSubjects, teacherGrades, semesters] = await Promise.all([
    prisma.class.findMany({
      where: {
        lessons: { some: { teacherId, isFreeLesson: false } }
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.lesson.findMany({
      where: {
        teacherId,
        isFreeLesson: false,
        subjectId: { not: null },
      },
      select: {
        classId: true,
        subject: {
          select: { id: true, name: true }
        }
      },
      distinct: ['classId', 'subjectId']
    }),
    prisma.subject.findMany({
      where: {
        OR: [
          { lessons: { some: { teacherId, isFreeLesson: false } } },
          { teachers: { some: { id: teacherId } } }
        ]
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
      orderBy: { startDate: 'asc' },
      include: { schoolYear: { select: { name: true } } }
    })
  ]);

  // Si l'enseignant n'a pas encore de cours planifiés, on propose l'ensemble des classes pour ne pas le bloquer
  if (classes.length === 0) {
    classes = await prisma.class.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  // Si aucune matière n'est trouvée pour cet enseignant, on propose toutes les matières
  if (teacherSubjects.length === 0) {
    teacherSubjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  const classSubjectPairs = classSubjectLessons
    .filter(l => l.subject !== null)
    .map(l => ({
      classId: l.classId,
      subjectId: l.subject!.id,
      subjectName: l.subject!.name
    }));

  return (
    <>
      <div className="border-b border-slate-200/90 bg-white/90 backdrop-blur-sm mb-8">
        <div className="mx-auto max-w-5xl py-3 px-4 text-sm text-slate-600 flex justify-between items-center">
          <div>
            <span className="text-slate-500 font-medium">Parcours :</span>{" "}
            Saisie groupée par classe & matière → Sujet libre → Enregistrement direct
          </div>
          <div className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">
            {teacherGrades.length} notes enregistrées
          </div>
        </div>
      </div>
      
      <GradeEntryClient 
        classes={classes} 
        subjects={teacherSubjects}
        classSubjectPairs={classSubjectPairs}
        initialGrades={JSON.parse(JSON.stringify(teacherGrades))} 
        semesters={JSON.parse(JSON.stringify(semesters))}
      />
    </>
  );
}
