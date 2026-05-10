import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
