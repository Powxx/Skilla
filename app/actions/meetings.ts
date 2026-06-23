"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { createNotification, checkEventEnabled } from "./notifications";

export async function createMeetingRequest(reason: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.meetingRequest.create({
    data: {
      senderId: session.user.id,
      reason,
    }
  });

  revalidatePath("/student");
  revalidatePath("/parent");
  revalidatePath("/employer");
  revalidatePath("/admin");
}

export async function updateMeetingStatus(id: string, status: any, scheduledAt?: Date, adminNotes?: string) {
  const session = await getServerSession(authOptions);
  if (String(session?.user?.role) !== "ADMIN" && String(session?.user?.role) !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const meeting = await prisma.meetingRequest.update({
    where: { id },
    data: {
      status,
      scheduledAt,
      adminNotes
    },
    include: { sender: true }
  });

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

  revalidatePath("/admin");
  revalidatePath("/student");
  revalidatePath("/student/dashboard");
  revalidatePath("/parent");
  revalidatePath("/employer");
  revalidatePath("/employer/dashboard");
  revalidatePath("/meetings");
}

/**
 * Admin creates a meeting directly as SCHEDULED.
 * If targetUserId is provided, the meeting is created on behalf of that user and they get notified.
 * If null, it's an internal admin reminder (no notification sent).
 */
export async function createAdminScheduledMeeting(data: {
  targetUserId: string | null;
  reason: string;
  scheduledAt: string;  // ISO string
  adminNotes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (String(session?.user?.role) !== "ADMIN" && String(session?.user?.role) !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }

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

  // Notify the target user (only if it's not an internal self-reminder)
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
