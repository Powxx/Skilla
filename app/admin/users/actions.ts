"use server";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";

const ADMIN_ROLES: Role[] = [
  Role.ADMIN,
  Role.TEACHER,
  Role.STUDENT,
  Role.PARENT,
  Role.EMPLOYER,
];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return null;
  }
  return session;
}

function roleLabelsFr(r: Role): string {
  const map: Record<Role, string> = {
    ADMIN: "Administrateur",
    TEACHER: "Professeur",
    STUDENT: "Élève",
    PARENT: "Parent",
    EMPLOYER: "Employeur",
  };
  return map[r];
}

export type MutationResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  classId?: string;
}): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Accès réservé aux administrateurs." };

  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const role = input.role;

  if (!email || !password || !firstName || !lastName) {
    return { ok: false, error: "Champs obligatoires manquants." };
  }
  if (!ADMIN_ROLES.includes(role)) {
    return { ok: false, error: "Rôle invalide." };
  }
  if (role === Role.STUDENT && !input.classId?.trim()) {
    return { ok: false, error: "Une classe est obligatoire pour un élève." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    if (role === Role.STUDENT) {
      const classe = await prisma.class.findUnique({
        where: { id: input.classId!.trim() },
      });
      if (!classe) return { ok: false, error: "Classe introuvable." };

      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role,
          firstName,
          lastName,
          studentProfile: { create: { classId: classe.id } },
        },
      });
    } else if (role === Role.TEACHER) {
      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role,
          firstName,
          lastName,
          teacherProfile: { create: {} },
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          role,
          firstName,
          lastName,
        },
      });
    }
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Un compte existe déjà avec cet e-mail." };
    }
    return { ok: false, error: "Impossible de créer l’utilisateur." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(input: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  newPassword?: string;
  studentClassId?: string;
}): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Accès réservé aux administrateurs." };

  const {
    userId,
    email: emailRaw,
    firstName: fnRaw,
    lastName: lnRaw,
    role: newRole,
    newPassword,
    studentClassId,
  } = input;

  const email = emailRaw.trim().toLowerCase();
  const firstName = fnRaw.trim();
  const lastName = lnRaw.trim();

  if (!userId || !email || !firstName || !lastName) {
    return { ok: false, error: "Champs obligatoires manquants." };
  }
  if (!ADMIN_ROLES.includes(newRole)) {
    return { ok: false, error: "Rôle invalide." };
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      teacherProfile: true,
    },
  });

  if (!existing) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });

  /** Dernier admin ne peut perdre son rôle. */
  if (
    existing.role === Role.ADMIN &&
    newRole !== Role.ADMIN &&
    adminCount <= 1
  ) {
    return {
      ok: false,
      error: "Impossible de retirer le rôle administrateur : c’est le dernier compte admin.",
    };
  }

  if (existing.studentProfile && newRole !== Role.STUDENT) {
    return {
      ok: false,
      error: `Impossible de passer au rôle « ${roleLabelsFr(newRole)} » : ce compte a un profil élève avec données liées.`,
    };
  }

  if (existing.teacherProfile && newRole !== Role.TEACHER) {
    const courseCount = await prisma.course.count({
      where: { teacher: { userId: existing.id } },
    });
    if (courseCount > 0) {
      return {
        ok: false,
        error:
          "Impossible de changer le rôle tant que des cours sont encore associés à ce professeur.",
      };
    }
  }

  if (newRole === Role.STUDENT && !existing.studentProfile) {
    const cid = studentClassId?.trim();
    if (!cid) {
      return {
        ok: false,
        error: "Pour affecter le rôle Élève, sélectionnez une classe.",
      };
    }
    const classe = await prisma.class.findUnique({ where: { id: cid } });
    if (!classe) return { ok: false, error: "Classe introuvable." };
  }

  const data: Prisma.UserUpdateInput = {
    email,
    firstName,
    lastName,
    role: newRole,
  };

  if (newPassword?.trim()) {
    data.password = await bcrypt.hash(newPassword.trim(), 10);
  }

  /** Passage ADMIN/PARENT … → PROF : création profil enseignant. */
  if (newRole === Role.TEACHER && !existing.teacherProfile) {
    data.teacherProfile = { create: {} };
  }

  /** Passage sans profil → ÉLÈVE. */
  if (newRole === Role.STUDENT && !existing.studentProfile) {
    data.studentProfile = {
      create: { classId: studentClassId!.trim() },
    };
  }

  /** Professeur sans cours → autre rôle : retirer le profil Teacher. */
  if (existing.teacherProfile && newRole !== Role.TEACHER) {
    data.teacherProfile = { delete: true };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data,
    });

    /** Si élève existe : mettre à jour la classe uniquement lorsque reste STUDENT et fourni classId différent intention */
    if (newRole === Role.STUDENT && existing.studentProfile && studentClassId?.trim()) {
      await prisma.student.updateMany({
        where: { userId },
        data: { classId: studentClassId.trim() },
      });
    }
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Un autre compte utilise déjà cet e-mail." };
    }
    return { ok: false, error: "Mise à jour impossible." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserSafe(userId: string): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Accès réservé aux administrateurs." };

  if (!userId?.trim()) {
    return { ok: false, error: "Utilisateur invalide." };
  }

  if (session.user?.id === userId) {
    return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      teacherProfile: {
        include: { _count: { select: { courses: true } } },
      },
    },
  });

  if (!existing) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  if (existing.studentProfile) {
    return {
      ok: false,
      error: "Les comptes avec profil élève ne peuvent pas être supprimés depuis cet écran.",
    };
  }
  if (existing.teacherProfile && existing.teacherProfile._count.courses > 0) {
    return {
      ok: false,
      error: "Ce professeur a encore des cours : suppression impossible.",
    };
  }

  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  if (existing.role === Role.ADMIN && adminCount <= 1) {
    return {
      ok: false,
      error: "Impossible de supprimer le dernier administrateur.",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (existing.teacherProfile) {
      await tx.teacher.delete({ where: { userId } });
    }
    await tx.user.delete({ where: { id: userId } });
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
