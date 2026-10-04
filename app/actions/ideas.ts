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

/**
 * Créer une nouvelle idée soumise par un membre de l'équipe administrative.
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

  const idea = await prisma.adminIdea.create({
    data: {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category || "OTHER",
      status: "SUBMITTED",
      authorId: session.user.id,
    },
  });

  revalidatePath("/admin/idees");
  revalidatePath("/admin");

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
  });

  revalidatePath("/admin/idees");
  revalidatePath("/admin");

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
