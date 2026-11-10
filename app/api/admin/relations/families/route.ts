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
    const { parentId, studentId } = await request.json();

    await prisma.user.update({
      where: { id: parentId },
      data: {
        students: { connect: { id: studentId } }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageUsers")) return NextResponse.json({ error: permissionDeniedMessage("canManageUsers") }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const studentId = searchParams.get('studentId');

    if (!parentId || !studentId) return NextResponse.json({ error: "IDs manquants" }, { status: 400 });

    await prisma.user.update({
      where: { id: parentId },
      data: {
        students: { disconnect: { id: studentId } }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}
