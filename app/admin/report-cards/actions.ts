"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";

export async function calculateStudentAverages(studentId: string, semesterId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { classId: true }
  });

  if (!student?.classId) return [];

  // 1. Get all grades for the class in this semester
  const classGrades = await prisma.grade.findMany({
    where: { semesterId, student: { classId: student.classId } },
    include: { subject: true }
  });

  // 2. Aggregate class data
  const classStats: Record<string, { sum: number, count: number }> = {};
  classGrades.forEach(g => {
    if (!classStats[g.subjectId]) classStats[g.subjectId] = { sum: 0, count: 0 };
    classStats[g.subjectId].sum += g.value * (g.coefficient || 1);
    classStats[g.subjectId].count += (g.coefficient || 1);
  });

  // 3. Aggregate student data
  const studentGrades = classGrades.filter(g => g.studentId === studentId);
  
  // Get dispensations
  const dispensations = await prisma.dispensation.findMany({
    where: { studentId }
  });
  const dispensedSubjectIds = dispensations.map(d => d.subjectId);

  const studentStats: Record<string, { sum: number, count: number, name: string, comments: string[], isDispensed: boolean }> = {};
  
  // Initialize with class subjects
  const classSubjects = await prisma.subject.findMany({
    where: { lessons: { some: { classId: student.classId } } },
    include: { teachers: { select: { firstName: true, lastName: true } } }
  });
  classSubjects.forEach(s => {
    const teacherNames = s.teachers.map(t => `${t.firstName} ${t.lastName}`).join(', ');
    studentStats[s.id] = { 
        sum: 0, 
        count: 0, 
        name: s.name, 
        comments: [], 
        isDispensed: dispensedSubjectIds.includes(s.id),
        teacherNames: teacherNames || 'Non assigné'
    };
  });

  studentGrades.forEach(g => {
    if (!g.subject) return; // Skip if subject relation is missing (should not happen for grades)
    if (!studentStats[g.subjectId]) {
      const teacherNames = g.subject.teachers.map(t => `${t.firstName} ${t.lastName}`).join(', ');
      studentStats[g.subjectId] = { sum: 0, count: 0, name: g.subject.name, comments: [], isDispensed: dispensedSubjectIds.includes(g.subjectId), teacherNames: teacherNames || 'Non assigné' };
    }
    const coef = g.coefficient || 1;
    studentStats[g.subjectId].sum += g.value * coef;
    studentStats[g.subjectId].count += coef;
    if (g.comment) studentStats[g.subjectId].comments.push(g.comment);
  });

  return Object.entries(studentStats).map(([id, data]) => ({
    subjectId: id,
    subjectName: data.name,
    teacherNames: data.teacherNames,
    average: data.isDispensed ? null : (data.count > 0 ? data.sum / data.count : null),
    classAverage: classStats[id] && classStats[id].count > 0 ? classStats[id].sum / classStats[id].count : null,
    comments: data.isDispensed ? "Dispensé(e)" : data.comments.join(" ; "),
    isDispensed: data.isDispensed
  })).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

export async function saveReportCard(data: {
  studentId: string;
  semesterId: string;
  generalAppraisal: string;
  distinction?: string;
}) {
  const reportCard = await prisma.reportCard.upsert({
    where: {
      // Since there is no unique constraint on studentId + semesterId in schema, 
      // we find first and update or create.
      // Ideally we'd add @unique([studentId, semesterId]) to the schema.
      id: (await prisma.reportCard.findFirst({
        where: { studentId: data.studentId, semesterId: data.semesterId },
        select: { id: true }
      }))?.id || 'temp-id'
    },
    update: {
      generalAppraisal: data.generalAppraisal,
      distinction: data.distinction
    },
    create: {
      studentId: data.studentId,
      semesterId: data.semesterId,
      generalAppraisal: data.generalAppraisal,
      distinction: data.distinction
    }
  });

  // Notify Student & Responsibles
  const isEnabled = await checkEventEnabled("REPORT_CARD_AVAILABLE");
  if (isEnabled) {
    const student = await prisma.user.findUnique({
      where: { id: data.studentId },
      include: { responsibles: true }
    });

    if (student) {
      const targets = [student.id, ...student.responsibles.map(r => r.id)];
      for (const targetId of targets) {
        createNotification({
          userId: targetId,
          title: "Bulletin disponible",
          message: `Le bulletin du semestre est désormais disponible pour ${student.firstName} ${student.lastName}.`,
          type: "SUCCESS",
          link: student.role === "STUDENT" ? "/student/grades" : "/parent/grades"
        }).catch(e => console.error(e));
      }
    }
  }

  revalidatePath("/admin/report-cards");
  return { ok: true, id: reportCard.id };
}

export async function toggleClassReportCardsVisibility(classId: string, visible: boolean) {
  await prisma.class.update({
    where: { id: classId },
    data: { reportCardsVisible: visible }
  });
  revalidatePath("/admin/report-cards");
  return { ok: true };
}
