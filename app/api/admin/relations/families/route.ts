import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { parentId, studentId } = await request.json();

    await prisma.user.update({
      where: { id: parentId },
      data: {
        students: { connect: { id: studentId } }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
