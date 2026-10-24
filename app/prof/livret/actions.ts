"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

async function requireLivretEvaluator(studentId: string, category: string = "SCHOOL") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non autorisé. Veuillez vous connecter.");
  }

  const role = session.user.role;
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return session;
  }

  if (role === "TEACHER") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canAccessLivrets: true }
    });
    if (user?.canAccessLivrets === false) {
      throw new Error("Accès aux livrets restreint par l'administration.");
    }
    return session;
  }

  if (role === "COMPANY_TUTOR" && category === "ENTERPRISE") {
    const hasContract = await prisma.companyContract.findFirst({
      where: { tutorId: session.user.id, studentId }
    });
    if (hasContract) {
      return session;
    }
  }

  throw new Error("Vous n'avez pas l'autorisation d'évaluer cet étudiant.");
}

export async function updateSkillLevel(studentId: string, competencyName: string, level: number, category: string = "SCHOOL", semesterId: string) {
  await requireLivretEvaluator(studentId, category);

  // Validation des limites de niveau
  const safeLevel = Math.max(1, Math.min(4, Math.round(level)));

  const existing = await prisma.evaluation.findFirst({
    where: { studentId, competency: competencyName, category, semesterId },
    select: { id: true }
  });

  if (existing) {
    await prisma.evaluation.update({
      where: { id: existing.id },
      data: { level: safeLevel, source: category === "SCHOOL" ? "TEACHER_EVAL" : "EMPLOYER_EVAL" }
    });
  } else {
    await prisma.evaluation.create({
      data: {
        studentId,
        competency: competencyName,
        level: safeLevel,
        semesterId,
        source: category === "SCHOOL" ? "TEACHER_EVAL" : "EMPLOYER_EVAL",
        category
      }
    });
  }

  revalidatePath("/prof/livret");
  revalidatePath("/student/livret");
  revalidatePath("/employer/livret");
  revalidatePath("/admin/recap/competencies");
}

export async function addCompetency(studentId: string, competencyName: string) {
  await requireLivretEvaluator(studentId, "SCHOOL");

  if (!competencyName?.trim()) {
    throw new Error("Le libellé de la compétence est obligatoire.");
  }

  await prisma.evaluation.create({
    data: {
      studentId,
      competency: competencyName.trim(),
      level: 1,
      source: "TEACHER_EVAL"
    }
  });
  revalidatePath("/prof/livret");
}
