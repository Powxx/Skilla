"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath, unstable_cache } from "next/cache";
import { sendPushNotification } from "./push";
import { SanctionStatus } from "@prisma/client";

// --- HELPERS ---

async function notifyUsersForSanction(studentId: string, sanctionTypeName: string, sanctionId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      responsibles: { select: { id: true } },
    },
  });
  if (!student) return;

  const title = "⚠️ Nouvelle sanction";
  const body = `Une sanction "${sanctionTypeName}" a été attribuée à ${student.firstName} ${student.lastName}.`;
  const url = "/student/sanctions";

  // Notify the student
  await prisma.notification.create({
    data: {
      userId: studentId,
      title,
      message: body,
      type: "WARNING",
      link: url,
      senderName: "Administration",
    },
  });
  sendPushNotification(studentId, { title, body, url }).catch(console.error);

  // Notify all parents (responsibles)
  for (const parent of student.responsibles ?? []) {
    const parentUrl = `/parent/sanctions?studentId=${studentId}`;
    await prisma.notification.create({
      data: {
        userId: parent.id,
        title,
        message: body,
        type: "WARNING",
        link: parentUrl,
        senderName: "Administration",
      },
    });
    sendPushNotification(parent.id, { title, body, url: parentUrl }).catch(console.error);
  }
}

async function notifyAdminsForEvent(title: string, message: string, link: string) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
    select: { id: true },
  });
  for (const admin of admins) {
    await prisma.notification.create({
      data: { userId: admin.id, title, message, type: "WARNING", link, senderName: "Système Disciplinaire" },
    });
    sendPushNotification(admin.id, { title, body: message, url: link }).catch(console.error);
  }
}

async function isPointsSystemEnabled(): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "SANCTIONS_POINTS_ENABLED" } });
  return setting?.value === "true";
}

async function isCommentsEnabled(): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "SANCTIONS_COMMENTS_ENABLED" } });
  return setting?.value === "true";
}

// Point thresholds that trigger admin notifications
const CONDUCT_THRESHOLDS = [
  { points: 50, type: "THRESHOLD_50", label: "⚠️ Palier 50 pts de conduite" },
  { points: 20, type: "THRESHOLD_20", label: "🔴 Palier critique 20 pts de conduite" },
];

async function handleConductPoints(studentId: string, sanctionId: string, pointsCost: number) {
  if (pointsCost <= 0) return;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { conductPoints: true, firstName: true, lastName: true },
  });
  if (!student) return;

  const oldPoints = student.conductPoints;
  const newPoints = Math.max(0, oldPoints - pointsCost);

  // Create deduction event
  await prisma.$transaction([
    prisma.user.update({ where: { id: studentId }, data: { conductPoints: newPoints } }),
    prisma.sanctionActionEvent.create({
      data: {
        studentId,
        sanctionId,
        type: "POINTS_DEDUCTED",
        description: `${pointsCost} points de conduite retirés (${oldPoints} → ${newPoints}).`,
      },
    }),
  ]);

  // Check thresholds crossed
  for (const threshold of CONDUCT_THRESHOLDS) {
    if (oldPoints > threshold.points && newPoints <= threshold.points) {
      const description = `${student.firstName} ${student.lastName} a atteint le palier de ${threshold.points} points de conduite (${newPoints} pts restants).`;
      await prisma.sanctionActionEvent.create({
        data: { studentId, sanctionId, type: threshold.type, description },
      });
      await notifyAdminsForEvent(
        threshold.label,
        description,
        "/admin/sanctions"
      );
    }
  }
}

// --- SANCTION TYPES (CONFIG) — Cached ---

export const getSanctionTypes = unstable_cache(
  async () => {
    return await prisma.sanctionType.findMany({ orderBy: { name: "asc" } });
  },
  ["sanction-types"],
  { tags: ["sanction-types"], revalidate: 3600 }
);

export async function createSanctionType(data: {
  name: string;
  description?: string;
  allowTeacher: boolean;
  allowAdmin: boolean;
  defaultPointsCost?: number;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN")
    throw new Error("Non autorisé.");

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
  data: { name: string; description?: string; allowTeacher: boolean; allowAdmin: boolean }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN")
    throw new Error("Non autorisé.");

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
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN")
    throw new Error("Non autorisé.");

  await prisma.sanctionType.delete({ where: { id } });
  revalidatePath("/admin/sanctions");
  return { ok: true };
}

// --- SANCTIONS (INSTANCES) ---

export async function getSanctions(cursor?: string, pageSize = 50) {
  const take = pageSize;
  const sanctions = await prisma.sanction.findMany({
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          conductPoints: true,
          class: { select: { id: true, name: true } },
        },
      },
      sanctionType: true,
      givenBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { date: "desc" },
  });

  const hasMore = sanctions.length > take;
  const data = hasMore ? sanctions.slice(0, take) : sanctions;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
}

export async function getStudentSanctions(studentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const commentsEnabled = await isCommentsEnabled();

  return await prisma.sanction.findMany({
    where: { studentId },
    include: {
      sanctionType: true,
      givenBy: { select: { firstName: true, lastName: true, role: true } },
      ...(commentsEnabled
        ? {
            comments: {
              include: { author: { select: { firstName: true, lastName: true, role: true } } },
              orderBy: { createdAt: "asc" },
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
  });
}

export async function getStudentActionEvents(studentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const callerRole = session.user.role;
  const isAdmin = callerRole === "ADMIN" || callerRole === "SUPER_ADMIN";
  if (!isAdmin && session.user.id !== studentId) {
    throw new Error("Non autorisé");
  }

  return await prisma.sanctionActionEvent.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getRecentActionEvents(limit = 50) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN")
    throw new Error("Non autorisé");

  return await prisma.sanctionActionEvent.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      sanction: { select: { sanctionType: { select: { name: true } } } },
    },
  });
}

export async function assignSanction(data: {
  studentId: string;
  sanctionTypeId: string;
  reason: string;
  duration?: string;
  date?: string;
  pointsCost?: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const callerId = session.user.id;
  const callerRole = session.user.role;

  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(callerRole))
    throw new Error("Non autorisé à attribuer des sanctions.");

  const sanctionType = await prisma.sanctionType.findUnique({ where: { id: data.sanctionTypeId } });
  if (!sanctionType) throw new Error("Type de sanction introuvable.");
  if (callerRole === "TEACHER" && !sanctionType.allowTeacher)
    throw new Error("Les enseignants ne peuvent pas attribuer ce type de sanction.");
  if ((callerRole === "ADMIN" || callerRole === "SUPER_ADMIN") && !sanctionType.allowAdmin)
    throw new Error("Les administrateurs ne peuvent pas attribuer ce type de sanction.");

  const parsedDate = data.date ? new Date(data.date) : new Date();
  const pointsCost = data.pointsCost ?? 0;
  const pointsEnabled = await isPointsSystemEnabled();

  const sanction = await prisma.sanction.create({
    data: {
      studentId: data.studentId,
      sanctionTypeId: data.sanctionTypeId,
      reason: data.reason.trim(),
      duration: data.duration?.trim() || null,
      date: parsedDate,
      givenById: callerId,
      pointsCost: pointsEnabled ? pointsCost : 0,
    },
  });

  // Handle conduct points
  if (pointsEnabled && pointsCost > 0) {
    await handleConductPoints(data.studentId, sanction.id, pointsCost);
  }

  // Push notifications to student + parents
  await notifyUsersForSanction(data.studentId, sanctionType.name, sanction.id).catch(console.error);

  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  revalidatePath("/student/sanctions");
  revalidatePath("/parent/sanctions");
  revalidatePath("/employer/sanctions");

  return { ok: true, sanction };
}

export async function updateSanctionStatus(id: string, status: SanctionStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const callerRole = session.user.role;
  const sanction = await prisma.sanction.findUnique({ where: { id } });
  if (!sanction) throw new Error("Sanction introuvable.");

  const isIssuer = sanction.givenById === session.user.id;
  const isAdmin = callerRole === "ADMIN" || callerRole === "SUPER_ADMIN";
  if (!isAdmin && !isIssuer) throw new Error("Non autorisé à modifier ce statut.");

  await prisma.sanction.update({ where: { id }, data: { status } });

  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  revalidatePath("/student/sanctions");
  revalidatePath("/parent/sanctions");
  revalidatePath("/employer/sanctions");
  return { ok: true };
}

export async function deleteSanction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const sanction = await prisma.sanction.findUnique({ where: { id } });
  if (!sanction) throw new Error("Sanction introuvable.");

  const isIssuer = sanction.givenById === session.user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isAdmin && !isIssuer) throw new Error("Non autorisé à supprimer cette sanction.");

  // Restore conduct points if system enabled
  const pointsEnabled = await isPointsSystemEnabled();
  if (pointsEnabled && sanction.pointsCost > 0) {
    await prisma.user.update({
      where: { id: sanction.studentId },
      data: { conductPoints: { increment: sanction.pointsCost } },
    });
  }

  await prisma.sanction.delete({ where: { id } });

  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  revalidatePath("/student/sanctions");
  revalidatePath("/parent/sanctions");
  revalidatePath("/employer/sanctions");
  return { ok: true };
}

// --- COMMENTS ---

export async function addSanctionComment(sanctionId: string, body: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");
  if (!body.trim()) throw new Error("Le commentaire ne peut pas être vide.");

  const enabled = await isCommentsEnabled();
  if (!enabled) throw new Error("Le système de commentaires est désactivé.");

  const comment = await prisma.sanctionComment.create({
    data: { sanctionId, authorId: session.user.id, body: body.trim() },
    include: { author: { select: { firstName: true, lastName: true, role: true } } },
  });

  revalidatePath("/student/sanctions");
  revalidatePath("/parent/sanctions");
  revalidatePath("/employer/sanctions");
  return { ok: true, comment };
}

export async function deleteSanctionComment(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const comment = await prisma.sanctionComment.findUnique({ where: { id } });
  if (!comment) throw new Error("Commentaire introuvable.");

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const isAuthor = comment.authorId === session.user.id;
  if (!isAdmin && !isAuthor) throw new Error("Non autorisé.");

  await prisma.sanctionComment.delete({ where: { id } });
  revalidatePath("/student/sanctions");
  revalidatePath("/parent/sanctions");
  revalidatePath("/employer/sanctions");
  return { ok: true };
}

// --- SETTINGS HELPERS ---
export { isPointsSystemEnabled, isCommentsEnabled };
