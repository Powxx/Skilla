"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { createNotification, checkEventEnabled } from "./notifications";

/**
 * Server Action : Crée une nouvelle demande d'entretien (meeting request).
 * Initiée par un étudiant, tuteur en entreprise ou parent/responsable.
 * 
 * @param reason Motif ou ordre du jour de la réunion demandée.
 */
export async function createMeetingRequest(reason: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé.");

  await prisma.meetingRequest.create({
    data: {
      senderId: session.user.id,
      reason,
    }
  });

  // Revalidation des caches pour afficher immédiatement la demande
  revalidatePath("/student");
  revalidatePath("/parent");
  revalidatePath("/employer");
  revalidatePath("/admin");
}

/**
 * Server Action : Modifie le statut d'une demande de réunion (validation, planification, complétion).
 * Réservé aux administrateurs. Déclenche des notifications in-app automatiques.
 * 
 * @param id ID de la réunion.
 * @param status Nouveau statut (ex: SCHEDULED, REJECTED, COMPLETED).
 * @param scheduledAt Date et heure du rendez-vous validé.
 * @param adminNotes Remarques administratives transmises à l'utilisateur.
 */
export async function updateMeetingStatus(id: string, status: any, scheduledAt?: Date, adminNotes?: string) {
  const session = await getServerSession(authOptions);
  if (String(session?.user?.role) !== "ADMIN" && String(session?.user?.role) !== "SUPER_ADMIN") 
    throw new Error("Non autorisé.");

  const meeting = await prisma.meetingRequest.update({
    where: { id },
    data: {
      status,
      scheduledAt,
      adminNotes
    },
    include: { sender: true }
  });

  // Envoi de notification si le type d'événement est activé
  const isEnabled = await checkEventEnabled("MEETING_UPDATE");
  if (isEnabled) {
    let message: string;
    
    if (status === "SCHEDULED" && scheduledAt) {
      const dateStr = scheduledAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeStr = scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      message = `✅ Votre rendez-vous a été confirmé le ${dateStr} à ${timeStr}.${adminNotes ? ` Note : ${adminNotes}` : ''}`;
    } else if (status === "REJECTED") {
      message = "❌ Votre demande de rendez-vous a été refusée par l'administration.";
    } else if (status === "COMPLETED") {
      message = "Le rendez-vous a été marqué comme terminé.";
    } else {
      message = `Le statut de votre demande a été mis à jour : ${status}.`;
    }

    await createNotification({
      userId: meeting.senderId,
      title: status === "SCHEDULED" ? "📅 Rendez-vous confirmé !" : "Mise à jour de votre demande de RDV",
      message,
      type: status === "SCHEDULED" ? "SUCCESS" : status === "REJECTED" ? "ERROR" : "INFO",
      link: "/meetings",
    });
  }

  // Force la mise à jour des pages de tous les acteurs potentiels
  revalidatePath("/admin");
  revalidatePath("/student");
  revalidatePath("/student/dashboard");
  revalidatePath("/parent");
  revalidatePath("/employer");
  revalidatePath("/employer/dashboard");
  revalidatePath("/meetings");
}

/**
 * Server Action : Planifie directement une réunion de manière proactive par un administrateur.
 * - Si targetUserId est fourni : la réunion est affectée à cet utilisateur, et il reçoit une notification.
 * - Si targetUserId est null : c'est un rappel personnel de l'admin (aucune notification envoyée).
 * 
 * @param data Objet contenant l'utilisateur cible, le motif, la date (chaîne ISO) et des notes optionnelles.
 */
export async function createAdminScheduledMeeting(data: {
  targetUserId: string | null;
  reason: string;
  scheduledAt: string;  // Chaîne au format ISO
  adminNotes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (String(session?.user?.role) !== "ADMIN" && String(session?.user?.role) !== "SUPER_ADMIN") {
    throw new Error("Non autorisé.");
  }

  // Si aucun destinataire n'est spécifié, l'administrateur crée le meeting pour lui-même
  const senderId = data.targetUserId ?? session!.user!.id!;
  const scheduledAt = new Date(data.scheduledAt);

  const meeting = await prisma.meetingRequest.create({
    data: {
      senderId,
      reason: data.reason,
      status: "SCHEDULED",
      scheduledAt,
      adminNotes: data.adminNotes ?? null,
    },
    include: { sender: { select: { firstName: true, lastName: true } } },
  });

  // Notifie l'utilisateur ciblé
  if (data.targetUserId) {
    const isEnabled = await checkEventEnabled("MEETING_UPDATE");
    if (isEnabled) {
      const dateStr = scheduledAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeStr = scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      await createNotification({
        userId: data.targetUserId,
        title: "📅 Rendez-vous planifié par l'administration",
        message: `Un entretien a été programmé pour vous le ${dateStr} à ${timeStr}.${data.adminNotes ? ` Note : ${data.adminNotes}` : ''}`,
        type: "SUCCESS",
        link: "/meetings",
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/meetings");
  return meeting;
}
