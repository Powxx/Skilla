"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "./push";

export async function getNotifications(userId: string, page: number = 1, pageSize: number = 20) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

export async function getUnreadCount(userId: string) {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(notificationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");
  
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
  revalidatePath("/", "layout");
}

export async function markAllAsRead(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) throw new Error("Non autorisé");

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/", "layout");
}

export async function sendAdminNotification(data: {
  target: 'CLASS' | 'SCHOOL';
  classId?: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) 
    throw new Error("Non autorisé");
  
  const senderName = "Administration";

  const whereClause: any = { role: "STUDENT" };
  if (data.target === 'CLASS' && data.classId) {
    whereClause.classId = data.classId;
  }

  const students = await prisma.user.findMany({
    where: whereClause,
    select: { id: true }
  });

  await prisma.notification.createMany({
    data: students.map(s => ({
      userId: s.id,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      senderName: senderName
    }))
  });
  
  for (const student of students) {
    sendPushNotification(student.id, {
      title: data.title,
      body: data.message,
      url: "/"
    }).catch(err => console.error("Push failed", student.id, err));
  }

  revalidatePath("/", "layout");
  return { ok: true, count: students.length };
}

export async function sendClassNotification(data: {
  classId: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");
  
  const senderName = `${session.user.name || 'Enseignant'}`;

  const students = await prisma.user.findMany({
    where: {
      classId: data.classId,
      role: "STUDENT"
    },
    select: { id: true }
  });

  const [notifications, log] = await prisma.$transaction([
    prisma.notification.createMany({
      data: students.map(s => ({
        userId: s.id,
        title: data.title,
        message: data.message,
        type: data.type || "INFO",
        senderName: senderName
      }))
    }),
    prisma.classNotificationLog.create({
      data: {
        senderId: session.user.id,
        classId: data.classId,
        title: data.title,
        message: data.message,
      }
    })
  ]);
  
  // Envoi des notifications push
  for (const student of students) {
    sendPushNotification(student.id, {
      title: data.title,
      body: data.message,
      url: "/"
    }).catch(err => console.error("Push failed for student", student.id, err));
  }

  revalidatePath("/");
  return { notifications, log };
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

  // Envoi push
  sendPushNotification(data.userId, {
    title: data.title,
    body: data.message,
    url: data.link || "/"
  }).catch(err => console.error("Push failed for user", data.userId, err));

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
  try {
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
        targetRoles: ["STUDENT", "RESPONSIBLE", "COMPANY_TUTOR"] as any[],
      },
      {
        event: "ABSENCE_ALERT",
        title: "Alerte Absence",
        message: "Une absence a été signalée aujourd'hui.",
        targetRoles: ["STUDENT", "RESPONSIBLE", "COMPANY_TUTOR"] as any[],
      },
      {
        event: "LATE_ALERT",
        title: "Alerte Retard",
        message: "Un retard a été signalé.",
        targetRoles: ["STUDENT", "RESPONSIBLE"] as any[],
      },
      {
        event: "ROOM_CHANGE",
        title: "Changement de salle",
        message: "La salle d'un de vos cours a été modifiée.",
        targetRoles: ["STUDENT"] as any[],
      },
      {
        event: "LESSON_CANCELLED",
        title: "Cours annulé",
        message: "Un de vos cours a été annulé.",
        targetRoles: ["STUDENT"] as any[],
      },
      {
        event: "SUBSTITUTION_VALIDATED",
        title: "Remplacement validé",
        message: "Un professeur remplaçant a été assigné à votre cours.",
        targetRoles: ["STUDENT"] as any[],
      },
      {
        event: "REPORT_CARD_AVAILABLE",
        title: "Bulletin disponible",
        message: "Votre bulletin semestriel est désormais disponible.",
        targetRoles: ["STUDENT", "RESPONSIBLE"] as any[],
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
  } catch (error) {
    console.error("Error in ensureDefaultConfigs:", error);
    // Don't crash the whole page if seeding fails
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

