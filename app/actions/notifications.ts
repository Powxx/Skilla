"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "./push";

async function getUserNotificationIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, linkedTeacherId: true }
  });

  const ids = [userId];
  if (user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && user.linkedTeacherId) {
    ids.push(user.linkedTeacherId);
  }
  return ids;
}

/**
 * Récupère la liste paginée des notifications in-app d'un utilisateur (incluant son prof lié si admin).
 * 
 * @param userId ID de l'utilisateur.
 * @param page Numéro de la page (indexé à 1).
 * @param pageSize Nombre de notifications par page.
 */
export async function getNotifications(userId: string, page: number = 1, pageSize: number = 20) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");
  if (session.user.id !== userId && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Non autorisé");
  }

  const ids = await getUserNotificationIds(userId);
  const notifications = await prisma.notification.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return notifications.map(n => ({
    ...n,
    isLinkedNotification: n.userId !== userId
  }));
}

/**
 * Compte le nombre de notifications non lues pour un utilisateur (et son compte prof lié si admin).
 */
export async function getUnreadCount(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return 0;
  if (session.user.id !== userId && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return 0;
  }

  const ids = await getUserNotificationIds(userId);
  return await prisma.notification.count({
    where: { userId: { in: ids }, isRead: false },
  });
}

/**
 * Server Action : Marque une notification spécifique comme lue.
 */
export async function markAsRead(notificationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");
  
  const userNotificationIds = await getUserNotificationIds(session.user.id);
  const notif = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true }
  });
  if (!notif) return;
  if (!userNotificationIds.includes(notif.userId) && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Non autorisé");
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
  
  // Revalide la mise en page racine pour mettre à jour la cloche de notification
  revalidatePath("/", "layout");
}

/**
 * Server Action : Marque TOUTES les notifications d'un utilisateur comme lues.
 */
export async function markAllAsRead(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) throw new Error("Non autorisé");

  const ids = await getUserNotificationIds(userId);
  await prisma.notification.updateMany({
    where: { userId: { in: ids }, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/", "layout");
}

/**
 * Server Action : Envoie une notification administrative globale (à toute l'école ou à une classe).
 * Envoie une notification in-app et émet des notifications push de navigateur.
 * Réservé aux administrateurs.
 * 
 * @param data Cible (classe ou école entière), ID de classe optionnel, titre, message et type visuel.
 */
export async function sendAdminNotification(data: {
  target: 'CLASS' | 'SCHOOL' | 'ALL_TEACHERS' | 'TEACHER';
  classId?: string;
  teacherId?: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) 
    throw new Error("Non autorisé");
  
  const senderName = "Administration";
  const notifType = data.type || "INFO";

  // Cas 1 : Envoi groupé à tous les professeurs actifs
  if (data.target === 'ALL_TEACHERS') {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, firstName: true, lastName: true }
    });

    if (teachers.length === 0) {
      return { ok: true, count: 0, message: "Aucun professeur actif trouvé." };
    }

    await prisma.notification.createMany({
      data: teachers.map(t => ({
        userId: t.id,
        title: data.title,
        message: data.message,
        type: notifType,
        senderName: senderName,
        link: "/prof"
      }))
    });

    for (const teacher of teachers) {
      sendPushNotification(teacher.id, {
        title: data.title,
        body: data.message,
        url: "/prof"
      }).catch(err => console.error("Push failed for teacher", teacher.id, err));
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/notifications");
    revalidatePath("/prof/notifications");
    return { ok: true, count: teachers.length, recipient: "Tous les professeurs" };
  }

  // Cas 2 : Envoi individuel à un professeur spécifique
  if (data.target === 'TEACHER') {
    if (!data.teacherId) {
      throw new Error("Veuillez sélectionner un professeur destinataire.");
    }

    const teacher = await prisma.user.findUnique({
      where: { id: data.teacherId, role: "TEACHER" },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!teacher) {
      throw new Error("Professeur introuvable ou inactif.");
    }

    const recipientLabel = `${teacher.lastName ?? ""} ${teacher.firstName ?? ""}`.trim() || "Professeur";

    await prisma.notification.create({
      data: {
        userId: teacher.id,
        title: data.title,
        message: data.message,
        type: notifType,
        senderName: senderName,
        link: "/prof"
      }
    });

    sendPushNotification(teacher.id, {
      title: data.title,
      body: data.message,
      url: "/prof"
    }).catch(err => console.error("Push failed for teacher", teacher.id, err));

    revalidatePath("/", "layout");
    revalidatePath("/admin/notifications");
    revalidatePath("/prof/notifications");
    return { ok: true, count: 1, recipient: recipientLabel };
  }

  // Cas 3 : Cible élèves (Toute l'école ou Classe spécifique)
  const whereClause: any = { role: "STUDENT", isActive: true };
  if (data.target === 'CLASS' && data.classId) {
    whereClause.classId = data.classId;
  }

  const students = await prisma.user.findMany({
    where: whereClause,
    select: { id: true }
  });

  // Création en masse dans la base de données
  await prisma.notification.createMany({
    data: students.map(s => ({
      userId: s.id,
      title: data.title,
      message: data.message,
      type: notifType,
      senderName: senderName,
      link: "/"
    }))
  });

  // Si envoi à une classe, consigner également dans ClassNotificationLog pour traçabilité
  if (data.target === 'CLASS' && data.classId) {
    await prisma.classNotificationLog.create({
      data: {
        senderId: session.user.id,
        classId: data.classId,
        title: data.title,
        message: data.message,
      }
    }).catch(err => console.error("Failed to create class log", err));
  }
  
  // Envoi asynchrone des pushs à tous les étudiants de la liste
  for (const student of students) {
    sendPushNotification(student.id, {
      title: data.title,
      body: data.message,
      url: "/"
    }).catch(err => console.error("Push failed", student.id, err));
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/notifications");
  return { ok: true, count: students.length };
}

/**
 * Server Action : Supprime une notification spécifique (admin).
 */
export async function deleteAdminNotification(notificationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) 
    throw new Error("Non autorisé");

  await prisma.notification.delete({
    where: { id: notificationId }
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/notifications");
  return { ok: true };
}

/**
 * Server Action : Envoie une notification collective à une classe de la part d'un enseignant ou de l'admin.
 * Enregistre également l'envoi dans la table d'historique ClassNotificationLog.
 */
export async function sendClassNotification(data: {
  classId: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");
  
  const senderName = `${session.user.name || 'Enseignant'}`;

  // Récupère les étudiants de la classe ciblée
  const students = await prisma.user.findMany({
    where: {
      classId: data.classId,
      role: "STUDENT",
      isActive: true
    },
    select: { id: true }
  });

  // Enregistrement transactionnel : création des notifications + log d'envoi classe
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
  
  // Envoi individuel des notifications push
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

/**
 * Fonction utilitaire interne : Crée une notification unique et envoie un push de navigateur.
 * 
 * @param data Destinataire, titre, message, type esthétique et lien de redirection optionnel.
 * @returns La notification créée.
 */
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

  // Déclenche le push de navigateur
  sendPushNotification(data.userId, {
    title: data.title,
    body: data.message,
    url: data.link || "/"
  }).catch(err => console.error("Push failed for user", data.userId, err));

  revalidatePath("/");
  return notification;
}

/**
 * Récupère les configurations des notifications.
 * Alimente automatiquement les valeurs par défaut dans la BDD s'il s'agit du premier appel.
 */
export async function getNotificationConfigs() {
  await ensureDefaultConfigs();
  return await prisma.notificationConfig.findMany({
    orderBy: { event: "asc" },
  });
}

/**
 * Renseigne les configurations par défaut en base de données si elles sont absentes.
 * Cela permet un déploiement fluide sur une nouvelle base sans nécessiter un script externe.
 */
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
        update: {}, // Ne modifie rien si la config existe déjà
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
  }
}

/**
 * Server Action : Met à jour la configuration d'activation et de ciblage d'une alerte système.
 */
export async function updateNotificationConfig(id: string, data: { isEnabled?: boolean; targetRoles?: any[] }) {
  await prisma.notificationConfig.update({
    where: { id },
    data,
  });
  revalidatePath("/admin/settings");
}

/**
 * Vérifie si un type d'événement est activé avant de déclencher des envois de notifications.
 * Si l'événement n'est pas renseigné en BDD, il est considéré comme activé par défaut.
 * 
 * @param event Clé de l'événement (ex: "NEW_GRADE").
 */
export async function checkEventEnabled(event: string) {
  const config = await prisma.notificationConfig.findUnique({
    where: { event },
  });
  return config?.isEnabled ?? true;
}
