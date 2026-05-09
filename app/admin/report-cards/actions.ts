"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";

export async function calculateStudentAverages(studentId: string, semesterId: string) {
  // 1. Get the student's class and its subjects (implicitly via lessons or skillMatrix, 
  // but let's assume we want ALL subjects existing in the system that might be relevant, 
  // or better, find subjects linked to lessons for this student's class)
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { classId: true }
  });

  const [grades, classSubjects] = await Promise.all([
    prisma.grade.findMany({
      where: { studentId, semesterId },
      include: { subject: true }
    }),
    student?.classId ? prisma.subject.findMany({
      where: {
        lessons: {
          some: { classId: student.classId }
        }
      }
    }) : prisma.subject.findMany()
  ]);

  const subjectAverages: Record<string, { sum: number, count: number, name: string, comments: string[] }> = {};

  // Initialize all class subjects with 0
  classSubjects.forEach(s => {
    subjectAverages[s.id] = { sum: 0, count: 0, name: s.name, comments: [] };
  });

  grades.forEach(g => {
    const sId = g.subjectId;
    if (!subjectAverages[sId]) {
      subjectAverages[sId] = { sum: 0, count: 0, name: g.subject.name, comments: [] };
    }
    const coef = g.coefficient || 1;
    subjectAverages[sId].sum += g.value * coef;
    subjectAverages[sId].count += coef;
    if (g.comment) {
      subjectAverages[sId].comments.push(g.comment);
    }
  });

  return Object.entries(subjectAverages).map(([id, data]) => ({
    subjectId: id,
    subjectName: data.name,
    average: data.count > 0 ? data.sum / data.count : null,
    comments: data.comments.join(" ; ")
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
