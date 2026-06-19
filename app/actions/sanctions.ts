"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

// --- SANCTION TYPES (CONFIG) ---

export async function getSanctionTypes() {
  return await prisma.sanctionType.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createSanctionType(data: {
  name: string;
  description?: string;
  allowTeacher: boolean;
  allowAdmin: boolean;
}) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new Error("Non autorisé : Droits administratifs requis.");
  }

  const sanctionType = await prisma.sanctionType.create({
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      allowTeacher: data.allowTeacher,
      allowAdmin: data.allowAdmin,
    },
  });

  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  return { ok: true, sanctionType };
}

export async function updateSanctionType(
  id: string,
  data: {
    name: string;
    description?: string;
    allowTeacher: boolean;
    allowAdmin: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new Error("Non autorisé : Droits administratifs requis.");
  }

  const sanctionType = await prisma.sanctionType.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      allowTeacher: data.allowTeacher,
      allowAdmin: data.allowAdmin,
    },
  });

  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  return { ok: true, sanctionType };
}

export async function deleteSanctionType(id: string) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new Error("Non autorisé : Droits administratifs requis.");
  }

  await prisma.sanctionType.delete({
    where: { id },
  });

  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  return { ok: true };
}

// --- SANCTIONS (INSTANCES) ---

export async function getSanctions() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non autorisé");
  }

  return await prisma.sanction.findMany({
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          class: { select: { id: true, name: true } },
        },
      },
      sanctionType: true,
      givenBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function getStudentSanctions(studentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non autorisé");
  }

  return await prisma.sanction.findMany({
    where: { studentId },
    include: {
      sanctionType: true,
      givenBy: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function assignSanction(data: {
  studentId: string;
  sanctionTypeId: string;
  reason: string;
  duration?: string;
  date?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non autorisé");
  }

  const callerId = session.user.id;
  const callerRole = session.user.role;

  if (
    callerRole !== "ADMIN" &&
    callerRole !== "SUPER_ADMIN" &&
    callerRole !== "TEACHER"
  ) {
    throw new Error("Non autorisé à attribuer des sanctions.");
  }

  const sanctionType = await prisma.sanctionType.findUnique({
    where: { id: data.sanctionTypeId },
  });

  if (!sanctionType) {
    throw new Error("Type de sanction introuvable.");
  }

  // Vérifier les habilitations de rôle pour ce type de sanction
  if (callerRole === "TEACHER" && !sanctionType.allowTeacher) {
    throw new Error("Les enseignants ne sont pas autorisés à attribuer ce type de sanction.");
  }
  if ((callerRole === "ADMIN" || callerRole === "SUPER_ADMIN") && !sanctionType.allowAdmin) {
    throw new Error("Les administrateurs ne sont pas autorisés à attribuer ce type de sanction.");
  }

  const parsedDate = data.date ? new Date(data.date) : new Date();

  const sanction = await prisma.sanction.create({
    data: {
      studentId: data.studentId,
      sanctionTypeId: data.sanctionTypeId,
      reason: data.reason.trim(),
      duration: data.duration?.trim() || null,
      date: parsedDate,
      givenById: callerId,
    },
  });

  // Revalidation pour tous les espaces
  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  revalidatePath("/student/sanctions");
  revalidatePath("/parent/sanctions");
  revalidatePath("/employer/sanctions");

  return { ok: true, sanction };
}

export async function deleteSanction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non autorisé");
  }

  const callerId = session.user.id;
  const callerRole = session.user.role;

  const existingSanction = await prisma.sanction.findUnique({
    where: { id },
  });

  if (!existingSanction) {
    throw new Error("Sanction introuvable.");
  }

  const isIssuer = existingSanction.givenById === callerId;
  const isAdmin = callerRole === "ADMIN" || callerRole === "SUPER_ADMIN";

  if (!isAdmin && !isIssuer) {
    throw new Error("Vous n'êtes pas autorisé à supprimer cette sanction.");
  }

  await prisma.sanction.delete({
    where: { id },
  });

  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  revalidatePath("/student/sanctions");
  revalidatePath("/parent/sanctions");
  revalidatePath("/employer/sanctions");

  return { ok: true };
}
