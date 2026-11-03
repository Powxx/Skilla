"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

// L'envoi de push est dans "@/lib/push" (usage serveur interne, non exposé comme Server Action).

export async function subscribeToPush(subscription: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non authentifié");

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId: session.user.id,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return { success: true };
}
