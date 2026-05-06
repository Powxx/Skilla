"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification, checkEventEnabled } from "@/app/actions/notifications";

export async function calculateStudentAverages(studentId: string, semesterId: string) {
  const grades = await prisma.grade.findMany({
    where: { studentId, semesterId },
    include: { subject: true }
  });

  const subjectAverages: Record<string, { sum: number, count: number, name: string }> = {};

  grades.forEach(g => {
    const sId = g.subjectId;
    if (!subjectAverages[sId]) {
      subjectAverages[sId] = { sum: 0, count: 0, name: g.subject.name };
    }
    const coef = g.coefficient || 1;
    subjectAverages[sId].sum += g.value * coef;
    subjectAverages[sId].count += coef;
  });

  return Object.entries(subjectAverages).map(([id, data]) => ({
    subjectId: id,
    subjectName: data.name,
    average: data.count > 0 ? data.sum / data.count : 0
  }));
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
