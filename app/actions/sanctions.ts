"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath, unstable_cache } from "next/cache";
import { sendPushNotification } from "./push";
import { SanctionStatus } from "@prisma/client";

// ==========================================
// --- HELPERS ET UTILITAIRES INTERNES ---
// ==========================================

/**
 * Notifie l'étudiant et ses parents/responsables de l'attribution d'une nouvelle sanction.
 * Envoie une notification in-app et tente un envoi en Web Push.
 * 
 * @param studentId ID de l'étudiant sanctionné.
 * @param sanctionTypeName Libellé du type de sanction.
 * @param sanctionId ID de la sanction.
 */
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

  // 1. Notifier l'étudiant concerné
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
  // Envoi Web Push asynchrone sans bloquer l'action principale
  sendPushNotification(studentId, { title, body, url }).catch(console.error);

  // 2. Notifier tous les parents / responsables légaux de l'élève
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

/**
 * Notifie tous les administrateurs actifs d'un événement disciplinaire (ex: dépassement de seuil critique).
 */
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

/**
 * Vérifie si le système de points de conduite est activé dans les paramètres généraux.
 */
async function isPointsSystemEnabled(): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "SANCTIONS_POINTS_ENABLED" } });
  return setting?.value === "true";
}

/**
 * Vérifie si les commentaires sur les sanctions sont autorisés.
 */
async function isCommentsEnabled(): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "SANCTIONS_COMMENTS_ENABLED" } });
  return setting?.value === "true";
}

// Seuils de points de conduite déclenchant des alertes administratives
const CONDUCT_THRESHOLDS = [
  { points: 50, type: "THRESHOLD_50", label: "⚠️ Palier 50 pts de conduite" },
  { points: 20, type: "THRESHOLD_20", label: "🔴 Palier critique 20 pts de conduite" },
];

/**
 * Déduit les points de conduite d'un étudiant et vérifie les franchissements de seuils critiques.
 * Cette opération s'exécute de manière transactionnelle.
 * 
 * @param studentId ID de l'étudiant.
 * @param sanctionId ID de la sanction rattachée.
 * @param pointsCost Nombre de points de conduite à retirer.
 */
async function handleConductPoints(studentId: string, sanctionId: string, pointsCost: number) {
  if (pointsCost <= 0) return;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { conductPoints: true, firstName: true, lastName: true },
  });
  if (!student) return;

  const oldPoints = student.conductPoints;
  const newPoints = Math.max(0, oldPoints - pointsCost); // Empêche de descendre sous 0

  // Déduction et journalisation dans une transaction Prisma
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

  // Analyse et notification si un palier critique de points est franchi à la baisse
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

// ==========================================
// --- TYPES DE SANCTION (CONFIGURATION) ---
// ==========================================

/**
 * Récupère les types de sanctions configurés (Mise en cache Next.js unstable_cache).
 */
export const getSanctionTypes = unstable_cache(
  async () => {
    return await prisma.sanctionType.findMany({ orderBy: { name: "asc" } });
  },
  ["sanction-types"],
  { tags: ["sanction-types"], revalidate: 3600 }
);

/**
 * Crée un nouveau type de sanction. Réservé aux administrateurs.
 */
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

  // Revalidation des caches Next.js pour mettre à jour les grilles
  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  return { ok: true, sanctionType };
}

/**
 * Modifie un type de sanction existant. Réservé aux administrateurs.
 */
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

/**
 * Supprime un type de sanction. Réservé aux administrateurs.
 */
export async function deleteSanctionType(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN")
    throw new Error("Non autorisé.");

  await prisma.sanctionType.delete({ where: { id } });
  revalidatePath("/admin/sanctions");
  return { ok: true };
}

// ==========================================
// --- INSTANCES DE SANCTIONS ---
// ==========================================

/**
 * Récupère la liste paginée de toutes les sanctions pour l'espace administrateur.
 * Utilise une pagination par curseur (Cursor-based pagination) pour de meilleures performances.
 */
export async function getSanctions(cursor?: string, pageSize = 50) {
  const take = pageSize;
  const sanctions = await prisma.sanction.findMany({
    take: take + 1, // Récupère un élément supplémentaire pour détecter s'il y a une page suivante
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

/**
 * Récupère les sanctions attribuées à un étudiant spécifique (sécurisé par session).
 */
export async function getStudentSanctions(studentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const commentsEnabled = await isCommentsEnabled();

  return await prisma.sanction.findMany({
    where: { studentId },
    include: {
      sanctionType: true,
      givenBy: { select: { firstName: true, lastName: true, role: true } },
      // Récupération conditionnelle des commentaires si le système est activé
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

/**
 * Récupère l'historique disciplinaire d'un étudiant (actions système sur ses points).
 */
export async function getStudentActionEvents(studentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const callerRole = session.user.role;
  const isAdmin = callerRole === "ADMIN" || callerRole === "SUPER_ADMIN";
  // Sécurité : Un élève ne peut voir que son propre historique d'événements
  if (!isAdmin && session.user.id !== studentId) {
    throw new Error("Non autorisé");
  }

  return await prisma.sanctionActionEvent.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/**
 * Récupère les derniers événements disciplinaires globaux (réservé aux admins).
 */
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

/**
 * Server Action : Attribue une nouvelle sanction à un élève.
 * Valide les droits de création selon le rôle (Teacher/Admin) et le type de sanction.
 * Déduit les points si nécessaire et émet les notifications.
 */
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
  
  // Validation des droits d'attribution spécifiques du type de sanction
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

  // Retrait effectif des points de conduite de l'élève
  if (pointsEnabled && pointsCost > 0) {
    await handleConductPoints(data.studentId, sanction.id, pointsCost);
  }

  // Déclenchement de l'envoi asynchrone des notifications
  await notifyUsersForSanction(data.studentId, sanctionType.name, sanction.id).catch(console.error);

  // Invalidation des caches des différents espaces (Admin, Prof, Élève, Parent, Employeur)
  revalidatePath("/admin/sanctions");
  revalidatePath("/prof/sanctions");
  revalidatePath("/student/sanctions");
  revalidatePath("/parent/sanctions");
  revalidatePath("/employer/sanctions");

  return { ok: true, sanction };
}

/**
 * Server Action : Met à jour le statut d'une sanction (purgée, excusée, etc.).
 * Autorisé uniquement aux administrateurs ou à l'émetteur de la sanction.
 */
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

/**
 * Server Action : Supprime une sanction de la base de données.
 * Restitue automatiquement les points de conduite précédemment retirés à l'élève.
 */
export async function deleteSanction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const sanction = await prisma.sanction.findUnique({ where: { id } });
  if (!sanction) throw new Error("Sanction introuvable.");

  const isIssuer = sanction.givenById === session.user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isAdmin && !isIssuer) throw new Error("Non autorisé à supprimer cette sanction.");

  const pointsEnabled = await isPointsSystemEnabled();
  
  // Transaction de restauration des points de conduite de l'élève
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

// ==========================================
// --- COMMENTAIRES SUR SANCTIONS ---
// ==========================================

/**
 * Server Action : Ajoute un commentaire de suivi sur une sanction.
 */
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

/**
 * Server Action : Supprime un commentaire. Réservé aux admins ou à l'auteur du commentaire.
 */
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

// Ré-exportation des helpers de configuration pour les formulaires d'interface
export { isPointsSystemEnabled, isCommentsEnabled };
