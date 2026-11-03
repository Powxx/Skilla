import { prisma } from "@/lib/prisma";
import webpush from "web-push";

/**
 * Envoi de notifications push (usage serveur interne uniquement).
 * Ce module ne doit PAS porter la directive "use server" : ses fonctions
 * seraient sinon exposées comme Server Actions appelables par n'importe quel client.
 */

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contact@skilla.edu";
  webpush.setVapidDetails(
    vapidSubject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string }) {
  return sendPushNotificationBatch([userId], payload);
}

export async function sendPushNotificationBatch(userIds: string[], payload: { title: string; body: string; url?: string }) {
  if (!userIds || userIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  if (subscriptions.length === 0) return;

  const expiredIds: string[] = [];

  const promises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        expiredIds.push(sub.id);
      } else {
        console.error("[sendPushNotificationBatch] Error sending push notification:", err);
      }
    }
  });

  await Promise.allSettled(promises);

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredIds } }
    }).catch(err => console.error("[sendPushNotificationBatch] Error cleaning expired subscriptions:", err));
  }
}
