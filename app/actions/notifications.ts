"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getNotifications(userId: string) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadCount(userId: string) {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(notificationId: string) {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
  revalidatePath("/");
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/");
}

export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  link?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      link: data.link,
    },
  });
  revalidatePath("/");
  return notification;
}

export async function getNotificationConfigs() {
  await ensureDefaultConfigs();
  return await prisma.notificationConfig.findMany({
    orderBy: { event: "asc" },
  });
}

async function ensureDefaultConfigs() {
  const defaults = [
    {
      event: "NEW_GRADE",
      title: "Nouvelle note disponible",
      message: "Une nouvelle note a été publiée.",
      targetRoles: ["STUDENT"] as any[],
    },
    {
      event: "MEETING_UPDATE",
      title: "Mise à jour de votre demande de rendez-vous",
      message: "Le statut de votre demande a été modifié.",
      targetRoles: ["STUDENT", "PARENT", "EMPLOYER"] as any[],
    }
  ];

  for (const def of defaults) {
    await prisma.notificationConfig.upsert({
      where: { event: def.event },
      update: {},
      create: {
        event: def.event,
        title: def.title,
        message: def.message,
        targetRoles: def.targetRoles,
      },
    });
  }
}


export async function updateNotificationConfig(id: string, data: { isEnabled?: boolean; targetRoles?: any[] }) {
  await prisma.notificationConfig.update({
    where: { id },
    data,
  });
  revalidatePath("/admin/settings");
}

export async function checkEventEnabled(event: string) {
  const config = await prisma.notificationConfig.findUnique({
    where: { event },
  });
  return config?.isEnabled ?? true; // Default to true if not configured
}

