"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { unstable_cache, revalidateTag } from "next/cache";

// --- EXISTING FUNCTIONS ---

export const getGlobalSettings = unstable_cache(
  async () => {
    console.log("[SettingsAction] Fetching global settings...");
    try {
      const settings = await prisma.globalSetting.findMany();
      console.log(`[SettingsAction] Successfully fetched ${settings.length} settings`);
      return settings;
    } catch (e) {
      console.error("[SettingsAction] CRITICAL ERROR FETCHING SETTINGS:", e);
      // On log le détail de l'erreur pour voir si c'est pgbouncer, timeout, ou autre
      if (e instanceof Error) {
        console.error(`[SettingsAction] Error Name: ${e.name}, Message: ${e.message}`);
      }
      return [];
    }
  },
  ["global-settings"],
  { tags: ["global-settings"], revalidate: 3600 }
);

export async function updateGlobalSetting(key: string, value: string) {
  await prisma.globalSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
  revalidateTag("global-settings", { expire: 0 });
}

export async function updateTeacherLivretAccess(teacherId: string, canAccess: boolean) {
  await prisma.user.update({ where: { id: teacherId }, data: { canAccessLivrets: canAccess } });
}

export async function getCalendarToken(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarToken: true } });
    return user?.calendarToken;
}

export async function changePassword(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Non connecté" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (newPassword !== confirmPassword) return { ok: false, error: "Les mots de passe ne correspondent pas" };
  if (newPassword.length < 8) return { ok: false, error: "Le mot de passe doit faire au moins 8 caractères" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.password) return { ok: false, error: "Utilisateur non trouvé" };

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) return { ok: false, error: "Ancien mot de passe incorrect" };

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword }
  });

  return { ok: true };
}

// --- NEW GDPR FUNCTIONS ---

export async function exportUserData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const userData = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: true,
      grades: true,
      absences: true,
      reportCards: true,
      gameScores: true,
    },
  });

  return JSON.stringify(userData, null, 2);
}

export async function requestAccountDeletion() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { deletionRequested: true },
  });

  return { ok: true };
}
