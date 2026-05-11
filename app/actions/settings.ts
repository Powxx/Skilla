"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

// Fonctions existantes qui ont été écrasées par erreur
export async function getGlobalSettings() {
  return await prisma.globalSetting.findMany();
}

export async function updateGlobalSetting(key: string, value: string) {
  await prisma.globalSetting.update({ where: { key }, data: { value } });
}

export async function updateTeacherLivretAccess(teacherId: string, canAccess: boolean) {
  await prisma.user.update({ where: { id: teacherId }, data: { canAccessLivrets: canAccess } });
}

export async function getCalendarToken(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarToken: true } });
    return user?.calendarToken;
}

// Nouvelle fonction
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
