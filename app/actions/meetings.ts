"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

export async function createMeetingRequest(reason: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.meetingRequest.create({
    data: {
      senderId: session.user.id,
      reason,
    }
  });

  revalidatePath("/student");
  revalidatePath("/parent");
  revalidatePath("/employer");
  revalidatePath("/admin");
}

export async function updateMeetingStatus(id: string, status: any, scheduledAt?: Date, adminNotes?: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.meetingRequest.update({
    where: { id },
    data: {
      status,
      scheduledAt,
      adminNotes
    }
  });

  revalidatePath("/admin");
}
