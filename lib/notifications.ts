import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendPushNotification, sendPushNotificationBatch } from "@/lib/push";

/**
 * Helpers de notification à usage serveur interne uniquement.
 * Ce module ne doit PAS porter la directive "use server" : ses fonctions
 * n'effectuent aucun contrôle d'accès et ne doivent pas être appelables par le client.
 */

/**
 * Crée une notification unique et envoie un push de navigateur.
 *
 * @param data Destinataire, titre, message, type esthétique, lien de redirection et nom de l'expéditeur optionnel.
 * @returns La notification créée.
 */
export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  link?: string;
  senderName?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      link: data.link,
      senderName: data.senderName || "Système",
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

/**
 * Notifie tous les élèves actifs d'une classe (in-app + push) et journalise l'envoi.
 * L'appelant est responsable de vérifier que l'expéditeur a le droit d'écrire à cette classe.
 */
export async function notifyClass(
  sender: { id: string; name?: string | null },
  data: {
    classId: string;
    title: string;
    message: string;
    type?: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
    /** Si fourni, les élèves dispensés de cette matière ne sont pas notifiés. */
    subjectId?: string | null;
  }
) {
  const senderName = `${sender.name || 'Enseignant'}`;

  // Récupère les étudiants de la classe ciblée (hors élèves dispensés de la matière)
  const students = await prisma.user.findMany({
    where: {
      classId: data.classId,
      role: "STUDENT",
      isActive: true,
      ...(data.subjectId ? { dispensations: { none: { subjectId: data.subjectId } } } : {})
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
        senderName: senderName,
        link: "/"
      }))
    }),
    prisma.classNotificationLog.create({
      data: {
        senderId: sender.id,
        classId: data.classId,
        title: data.title,
        message: data.message,
      }
    })
  ]);

  // Envoi asynchrone groupé des pushs
  sendPushNotificationBatch(students.map(s => s.id), {
    title: data.title,
    body: data.message,
    url: "/"
  }).catch(err => console.error("Push failed for class", data.classId, err));

  revalidatePath("/");
  return { notifications, log };
}
