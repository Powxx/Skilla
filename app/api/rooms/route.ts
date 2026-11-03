import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { hasAdminPermission, permissionDeniedMessage } from "@/lib/authz";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rooms = await prisma.room.findMany({
    orderBy: { name: 'asc' }
  });

  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageSettings")) {
    return NextResponse.json({ error: permissionDeniedMessage("canManageSettings") }, { status: 403 });
  }

  try {
    const data = await request.json();
    const newRoom = await prisma.room.create({
      data: {
        name: data.name,
        capacity: data.capacity ? parseInt(data.capacity) : null,
      }
    });
    return NextResponse.json(newRoom);
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasAdminPermission(session?.user, "canManageSettings")) {
    return NextResponse.json({ error: permissionDeniedMessage("canManageSettings") }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID manquant");

    await prisma.$transaction([
      prisma.lesson.updateMany({
        where: { roomId: id },
        data: { roomId: null },
      }),
      prisma.room.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 400);
  }
}
