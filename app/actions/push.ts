"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import webpush from "web-push";

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

export async function subscribeToPush(subscription: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Non authentifié");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) throw new Error("Utilisateur non trouvé");

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return { success: true };
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

