"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getGlobalSettings() {
  const settings = await prisma.globalSetting.findMany();
  const settingsMap: Record<string, string> = {};
  settings.forEach(s => {
    settingsMap[s.key] = s.value;
  });
  return settingsMap;
}

export async function updateGlobalSetting(key: string, value: string) {
  await prisma.globalSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  revalidatePath("/admin/settings");
}

export async function updateTeacherLivretAccess(userId: string, canAccess: boolean) {
  await prisma.user.update({
    where: { id: userId },
    data: { canAccessLivrets: canAccess },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
}
