import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { teacherId, monthlyHours } = data;

    if (!teacherId) {
      throw new Error("ID du professeur manquant");
    }

    const contract = await prisma.teacherContract.upsert({
      where: { teacherId },
      update: {
        monthlyHours: parseFloat(monthlyHours),
      },
      create: {
        teacherId,
        hourlyRate: 0, // Champ requis dans le schéma, on met 0 par défaut
        monthlyHours: parseFloat(monthlyHours),
      },
    });

    return NextResponse.json(contract);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
