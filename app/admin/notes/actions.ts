"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Accès réservé aux administrateurs.");
  }
  return session;
}

export type GradePayload = {
  id: string;
  value: number;
  coefficient: number;
  subjectName: string;
  comment: string | null;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    className: string;
    classId: string | null;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  subject: {
    id: string;
    name: string;
  };
  semester: {
    id: string;
    name: string;
  };
};

export type GradeSummaryStats = {
  totalCount: number;
  averageValue: number | null;
  minGrade: number | null;
  maxGrade: number | null;
  failingCount: number; // < 10
  passingCount: number; // >= 10
};

export async function getAdminRecentGrades(filters?: {
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  semesterId?: string;
  search?: string;
  period?: "7d" | "30d" | "90d" | "all";
}) {
  await requireAdmin();

  let whereClause: any = {};

  if (filters?.classId) {
    whereClause.student = { classId: filters.classId };
  }

  if (filters?.subjectId) {
    whereClause.subjectId = filters.subjectId;
  }

  if (filters?.teacherId) {
    whereClause.teacherId = filters.teacherId;
  }

  if (filters?.semesterId) {
    whereClause.semesterId = filters.semesterId;
  }

  if (filters?.period && filters.period !== "all") {
    const now = new Date();
    const subDays = filters.period === "7d" ? 7 : filters.period === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(now.getDate() - subDays);
    whereClause.createdAt = { gte: startDate };
  }

  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    whereClause.OR = [
      { student: { firstName: { contains: q, mode: "insensitive" } } },
      { student: { lastName: { contains: q, mode: "insensitive" } } },
      { subject: { name: { contains: q, mode: "insensitive" } } },
      { teacher: { firstName: { contains: q, mode: "insensitive" } } },
      { teacher: { lastName: { contains: q, mode: "insensitive" } } },
      { comment: { contains: q, mode: "insensitive" } },
    ];
  }

  const rawGrades = await prisma.grade.findMany({
    where: whereClause,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classId: true,
          class: { select: { name: true } }
        }
      },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      subject: {
        select: {
          id: true,
          name: true
        }
      },
      semester: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  const grades: GradePayload[] = rawGrades.map((g) => ({
    id: g.id,
    value: g.value,
    coefficient: g.coefficient,
    subjectName: g.subjectName || g.subject.name,
    comment: g.comment,
    createdAt: g.createdAt.toISOString(),
    student: {
      id: g.student.id,
      firstName: g.student.firstName || "",
      lastName: g.student.lastName || "",
      className: g.student.class?.name || "Sans classe",
      classId: g.student.classId
    },
    teacher: g.teacher ? {
      id: g.teacher.id,
      firstName: g.teacher.firstName || "",
      lastName: g.teacher.lastName || ""
    } : null,
    subject: {
      id: g.subject.id,
      name: g.subject.name
    },
    semester: {
      id: g.semester.id,
      name: g.semester.name
    }
  }));

  // Statistiques calculées sur l'échantillon sélectionné
  let totalWx = 0;
  let totalCoeff = 0;
  let minGrade: number | null = null;
  let maxGrade: number | null = null;
  let failingCount = 0;
  let passingCount = 0;

  for (const g of grades) {
    const c = g.coefficient > 0 ? g.coefficient : 1;
    totalWx += g.value * c;
    totalCoeff += c;

    if (minGrade === null || g.value < minGrade) minGrade = g.value;
    if (maxGrade === null || g.value > maxGrade) maxGrade = g.value;

    if (g.value < 10) failingCount++;
    else passingCount++;
  }

  const summaryStats: GradeSummaryStats = {
    totalCount: grades.length,
    averageValue: totalCoeff > 0 ? Math.round((totalWx / totalCoeff) * 100) / 100 : null,
    minGrade,
    maxGrade,
    failingCount,
    passingCount
  };

  return { grades, summaryStats };
}

export async function updateAdminGrade(
  gradeId: string,
  data: { value: number; coefficient: number; comment?: string | null }
) {
  await requireAdmin();

  if (data.value < 0 || data.value > 20) {
    throw new Error("La note doit être comprise entre 0 et 20.");
  }
  if (data.coefficient <= 0) {
    throw new Error("Le coefficient doit être supérieur à 0.");
  }

  await prisma.grade.update({
    where: { id: gradeId },
    data: {
      value: data.value,
      coefficient: data.coefficient,
      comment: data.comment || null
    }
  });

  revalidatePath("/admin/notes");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/report-cards");
  return { ok: true };
}

export async function deleteAdminGrade(gradeId: string) {
  await requireAdmin();

  await prisma.grade.delete({
    where: { id: gradeId }
  });

  revalidatePath("/admin/notes");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/report-cards");
  return { ok: true };
}
