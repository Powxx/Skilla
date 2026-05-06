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
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

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
    await createNotification({
      userId: meeting.senderId,
      title: "Mise à jour de votre demande de rendez-vous",
      message: `Le statut de votre demande est passé à : ${status}${scheduledAt ? ` (Prévu le ${scheduledAt.toLocaleDateString('fr-FR')})` : ''}`,
      type: status === "SCHEDULED" ? "SUCCESS" : status === "REJECTED" ? "ERROR" : "INFO",
    });
  }

  revalidatePath("/admin");
}
