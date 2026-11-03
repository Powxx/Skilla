import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { hasAdminPermission, permissionDeniedMessage } from "@/lib/authz";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageRH")) {
    return NextResponse.json({ error: permissionDeniedMessage("canManageRH") }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { teacherId, annualHours } = data;

    if (!teacherId) {
      throw new Error("ID du professeur manquant");
    }

    const contract = await prisma.teacherContract.upsert({
      where: { teacherId },
      update: {
        annualHours: parseFloat(annualHours),
      },
      create: {
        teacherId,
        hourlyRate: 0, // Champ requis dans le schéma, on met 0 par défaut
        annualHours: parseFloat(annualHours),
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}
