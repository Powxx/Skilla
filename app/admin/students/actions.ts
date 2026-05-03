"use server";

import prisma from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";

export type CreateStudentState = {
  error?: string;
};

export async function createStudent(
  _prev: CreateStudentState | undefined,
  formData: FormData,
): Promise<CreateStudentState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();

  if (!email || !password || !firstName || !lastName || !classId) {
    return { error: "Tous les champs sont obligatoires." };
  }

  const classe = await prisma.class.findUnique({ where: { id: classId } });
  if (!classe) {
    return { error: "Classe introuvable." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: Role.STUDENT,
        name: `${firstName} ${lastName}`,
        studentProfile: {
          create: { classId },
        },
      },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Un compte existe déjà avec cet e-mail." };
    }
    return { error: "Impossible de créer l’élève. Réessayez." };
  }

  redirect("/admin/students");
}
