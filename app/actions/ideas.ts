"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AdminIdeaCategory, AdminIdeaStatus } from "@prisma/client";

function canAccessAdminIdeas(session: any) {
  if (!session?.user?.id) return false;
  const role = session.user.role;
  const isGen = session.user.isGeneralAdmin === true;
  return role === "ADMIN" || role === "SUPER_ADMIN" || isGen;
}

function isGeneralAdminUser(session: any, currentUser?: any) {
  if (!session?.user) return false;
  return (
    session.user.role === "SUPER_ADMIN" ||
    session.user.isGeneralAdmin === true ||
    currentUser?.isGeneralAdmin === true
  );
}

import { sendPushNotificationBatch } from "./push";

/**
 * Créer une nouvelle idée ou un signalement de panne soumis par un membre de l'équipe administrative.
 * Notifie automatiquement l'Administrateur Général.
 */
export async function createAdminIdea(data: {
  title: string;
  description: string;
  category: AdminIdeaCategory;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !canAccessAdminIdeas(session)) {
    throw new Error("Accès refusé");
  }

  if (!data.title?.trim() || !data.description?.trim()) {
    throw new Error("Le titre et la description sont obligatoires.");
  }

  const author = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, lastName: true },
  });
  const authorName = author ? `${author.firstName || ""} ${author.lastName || ""}`.trim() || "Un administrateur" : "Un administrateur";

  const idea = await prisma.adminIdea.create({
    data: {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category || "OTHER",
      status: "SUBMITTED",
      authorId: session.user.id,
    },
  });

  const isBreakdown = (data.category as string) === "BREAKDOWN";
  const notifTitle = isBreakdown
    ? `🚨 Signalement de panne : ${idea.title}`
    : `💡 Nouvelle proposition : ${idea.title}`;
  const notifMessage = isBreakdown
    ? `Une panne ou un incident technique a été signalé par ${authorName} : "${idea.title}". Description : ${idea.description.length > 140 ? idea.description.substring(0, 140) + "..." : idea.description}`
    : `${authorName} a soumis une suggestion dans la boîte à idées : "${idea.title}".`;
  const notifType = isBreakdown ? "ERROR" : "INFO";

  // Trouver tous les administrateurs généraux pour leur notifier la remontée
  const generalAdmins = await prisma.user.findMany({
    where: {
      OR: [
        { isGeneralAdmin: true },
        { role: "SUPER_ADMIN" },
        { email: { equals: "admin@skilla.edu", mode: "insensitive" } },
        { username: { equals: "admin", mode: "insensitive" } },
      ],
      isActive: true,
    },
    select: { id: true },
  });

  if (generalAdmins.length > 0) {
    const adminIds = generalAdmins.map((a) => a.id);
    await prisma.notification.createMany({
      data: adminIds.map((adminId) => ({
        userId: adminId,
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        senderName: authorName,
        link: "/admin/idees",
      })),
    });

    sendPushNotificationBatch(adminIds, {
      title: notifTitle,
      body: notifMessage,
      url: "/admin/idees",
    }).catch((err) => console.error("[createAdminIdea] Push error:", err));
  }

  revalidatePath("/admin/idees");
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return idea;
}

/**
 * Voter / Soutenir une idée (ou annuler son vote).
 */
export async function toggleAdminIdeaVote(ideaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !canAccessAdminIdeas(session)) {
    throw new Error("Accès refusé");
  }

  const userId = session.user.id;

  const existingVote = await prisma.adminIdeaVote.findUnique({
    where: {
      ideaId_userId: {
        ideaId,
        userId,
      },
    },
  });

  let hasVoted = false;
  if (existingVote) {
    await prisma.adminIdeaVote.delete({
      where: { id: existingVote.id },
    });
    hasVoted = false;
  } else {
    await prisma.adminIdeaVote.create({
      data: {
        ideaId,
        userId,
      },
    });
    hasVoted = true;
  }

  revalidatePath("/admin/idees");
  return { hasVoted };
}

/**
 * Arbitrage d'une idée par l'Administrateur Général.
 * Réservé exclusivement à l'utilisateur disposant des droits admin général.
 */
export async function updateAdminIdeaStatus(data: {
  ideaId: string;
  status: AdminIdeaStatus;
  adminResponse?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non authentifié");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isGeneralAdmin: true },
  });

  if (!isGeneralAdminUser(session, currentUser)) {
    throw new Error("Action réservée à l'Administrateur Général.");
  }

  const updated = await prisma.adminIdea.update({
    where: { id: data.ideaId },
    data: {
      status: data.status,
      adminResponse: data.adminResponse?.trim() || null,
      respondedAt: new Date(),
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Notifier l'auteur du signalement ou de l'idée
  if (updated.authorId && updated.authorId !== session.user.id) {
    const statusLabels: Record<AdminIdeaStatus, string> = {
      SUBMITTED: "Nouveau",
      UNDER_REVIEW: "En cours d'étude",
      ACCEPTED: "Retenu / Pris en charge",
      REJECTED: "Non retenu",
      IMPLEMENTED: "Résolu / Déployé",
    };
    const isBreakdown = (updated.category as string) === "BREAKDOWN";
    const statusLabel = statusLabels[data.status] || data.status;
    const authorNotifTitle = isBreakdown
      ? `Suivi Panne : ${updated.title}`
      : `Suivi Proposition : ${updated.title}`;
    const authorNotifMessage = `Votre ${isBreakdown ? "signalement de panne" : "proposition"} est passé au statut « ${statusLabel} ».${data.adminResponse?.trim() ? ` Réponse : "${data.adminResponse.trim()}"` : ""}`;
    const authorNotifType = data.status === "IMPLEMENTED" || data.status === "ACCEPTED" ? "SUCCESS" : data.status === "REJECTED" ? "WARNING" : "INFO";

    await prisma.notification.create({
      data: {
        userId: updated.authorId,
        title: authorNotifTitle,
        message: authorNotifMessage,
        type: authorNotifType,
        senderName: "Administrateur Général",
        link: "/admin/idees",
      },
    }).catch((err) => console.error("Author notif error:", err));

    sendPushNotificationBatch([updated.authorId], {
      title: authorNotifTitle,
      body: authorNotifMessage,
      url: "/admin/idees",
    }).catch(() => {});
  }

  revalidatePath("/admin/idees");
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return updated;
}

/**
 * Supprimer une idée (par l'auteur ou par l'administrateur général).
 */
export async function deleteAdminIdea(ideaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non authentifié");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isGeneralAdmin: true },
  });

  const idea = await prisma.adminIdea.findUnique({
    where: { id: ideaId },
    select: { authorId: true },
  });

  if (!idea) {
    throw new Error("Idée introuvable");
  }

  const isGen = isGeneralAdminUser(session, currentUser);
  const isAuthor = idea.authorId === session.user.id;

  if (!isGen && !isAuthor) {
    throw new Error("Vous n'êtes pas autorisé à supprimer cette idée.");
  }

  await prisma.adminIdea.delete({
    where: { id: ideaId },
  });

  revalidatePath("/admin/idees");
  revalidatePath("/admin");

  return { success: true };
}
