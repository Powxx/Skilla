"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    throw new Error("Non autorisé.");
  }
  return session;
}

export async function getQualiopiData() {
  await assertAdmin();

  const [complaints, surveys] = await Promise.all([
    prisma.complaint.findMany({
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.satisfactionSurvey.findMany({
      include: { student: { select: { firstName: true, lastName: true, class: { select: { name: true } } } } },
      orderBy: { id: "desc" },
    }),
  ]);

  return { complaints, surveys };
}

export async function updateComplaintStatus(id: string, status: string) {
  await assertAdmin();

  const allowed = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!allowed.includes(status)) throw new Error("Statut invalide.");

  await prisma.complaint.update({ where: { id }, data: { status } });

  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function deleteComplaint(id: string) {
  await assertAdmin();
  await prisma.complaint.delete({ where: { id } });
  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function deleteSatisfactionSurvey(id: string) {
  await assertAdmin();
  await prisma.satisfactionSurvey.delete({ where: { id } });
  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
