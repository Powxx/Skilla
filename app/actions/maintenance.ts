"use server";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth/next";
import { subMonths } from "date-fns";
import { revalidatePath } from "next/cache";

/**
 * Nettoie les notifications plus vieilles qu'un mois.
 * Utilisable manuellement depuis l'interface admin.
 */
export async function cleanupOldNotifications() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, error: "Non autorisé" };
  }

  const oneMonthAgo = subMonths(new Date(), 1);

  try {
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: oneMonthAgo,
        },
      },
    });

    revalidatePath("/admin/settings");
    return { ok: true, count: result.count };
  } catch (error: any) {
    console.error("ERREUR CLEANUP NOTIFS:", error);
    return { ok: false, error: error.message };
  }
}
