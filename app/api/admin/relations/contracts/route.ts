import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { hasAdminPermission, permissionDeniedMessage } from "@/lib/authz";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageUsers")) return NextResponse.json({ error: permissionDeniedMessage("canManageUsers") }, { status: 403 });

  try {
    const { studentId, tutorId, type, startDate, endDate } = await request.json();

    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
      select: { company: true }
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tuteur introuvable" }, { status: 400 });
    }

    const companyName = tutor.company || "Entreprise Inconnue";

    const contract = await prisma.companyContract.create({
      data: {
        studentId,
        tutorId,
        companyName,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    });

    return NextResponse.json(contract);
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageUsers")) return NextResponse.json({ error: permissionDeniedMessage("canManageUsers") }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    await prisma.companyContract.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}
