import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { hasAdminPermission, permissionDeniedMessage } from "@/lib/authz";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManagePlanning")) {
    return NextResponse.json({ error: permissionDeniedMessage("canManagePlanning") }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { teacherId, subjectIds } = data;

    if (!teacherId || !Array.isArray(subjectIds)) {
      throw new Error("Invalid payload");
    }

    // Prisma update with set (replaces the existing relations)
    const updatedUser = await prisma.user.update({
      where: { id: teacherId },
      data: {
        subjects: {
          set: subjectIds.map((id: string) => ({ id }))
        }
      },
      include: { subjects: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}
