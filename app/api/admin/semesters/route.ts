import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { hasAdminPermission, permissionDeniedMessage } from "@/lib/authz";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const semesters = await prisma.semester.findMany({
    orderBy: { startDate: 'asc' },
    include: { schoolYear: true }
  });
  return NextResponse.json(semesters);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageSettings")) return NextResponse.json({ error: permissionDeniedMessage("canManageSettings") }, { status: 403 });
  try {
    const { name, startDate, endDate, schoolYearId } = await request.json();
    const newSemester = await prisma.semester.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schoolYearId: schoolYearId || null
      }
    });
    return NextResponse.json(newSemester);
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageSettings")) return NextResponse.json({ error: permissionDeniedMessage("canManageSettings") }, { status: 403 });
  try {
    const { id, schoolYearId } = await request.json();
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    const updated = await prisma.semester.update({
      where: { id },
      data: { schoolYearId: schoolYearId || null }
    });
    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageSettings")) return NextResponse.json({ error: permissionDeniedMessage("canManageSettings") }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  try {
    await prisma.semester.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}

