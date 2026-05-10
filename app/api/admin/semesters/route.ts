import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const semesters = await prisma.semester.findMany({ orderBy: { startDate: 'asc' } });
  return NextResponse.json(semesters);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const { name, startDate, endDate } = await request.json();
    const newSemester = await prisma.semester.create({ 
      data: { 
        name, 
        startDate: new Date(startDate), 
        endDate: new Date(endDate) 
      } 
    });
    return NextResponse.json(newSemester);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  try {
    await prisma.semester.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
