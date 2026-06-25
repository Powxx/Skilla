"use server";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";

const ADMIN_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.TEACHER,
  Role.STUDENT,
  Role.RESPONSIBLE,
  Role.COMPANY_TUTOR,
];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    return null;
  }
  return session;
}

function roleLabelsFr(r: Role): string {
  const map: Record<Role, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Administrateur",
    TEACHER: "Professeur",
    STUDENT: "Élève",
    RESPONSIBLE: "Responsable",
    COMPANY_TUTOR: "Employeur",
  };
  return map[r];
}

export async function updateAdminPermissions(input: {
  userId: string;
  canManageUsers?: boolean;
  canManageSettings?: boolean;
  canManagePlanning?: boolean;
  canManageRH?: boolean;
  canAccessLivrets?: boolean;
  canImpersonate?: boolean;
  isActive?: boolean;
}): Promise<MutationResult> {
  const session = await requireAdmin();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Action réservée aux Super Administrateurs." };
  }

  const { userId, ...data } = input;

  try {
    await prisma.user.update({
      where: { id: userId },
      data,
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Erreur lors de la mise à jour." };
  }
}

export type MutationResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
  const initial = firstName.trim().charAt(0).toLowerCase();
  const cleanLastName = lastName.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  const base = `${initial}-${cleanLastName}`;
  
  let username = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) break;
    username = `${base}${counter}`;
    counter++;
  }
  return username;
}

export async function createUser(input: {
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: Role;
  classId?: string;
}): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Accès réservé aux administrateurs." };

  const email = input.email?.trim() ? input.email.trim().toLowerCase() : null;
  const password = input.password;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const role = input.role;

  if (!password || !firstName || !lastName) {
    return { ok: false, error: "Champs obligatoires manquants." };
  }
  if (!ADMIN_ROLES.includes(role)) {
    return { ok: false, error: "Rôle invalide." };
  }
  if (role === Role.STUDENT && !input.classId?.trim()) {
    return { ok: false, error: "Une classe est obligatoire pour un élève." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const fullName = `${firstName} ${lastName}`;
  const username = await generateUniqueUsername(firstName, lastName);

  try {
    if (role === Role.STUDENT) {
      const classe = await prisma.class.findUnique({
        where: { id: input.classId!.trim() },
      });
      if (!classe) return { ok: false, error: "Classe introuvable." };

      await prisma.user.create({
        data: {
          email,
          username,
          password: passwordHash,
          role,
          firstName,
          lastName,
          name: fullName,
          class: { connect: { id: classe.id } }, // Important pour le planning élève
          studentProfile: { create: { classId: classe.id } },
        },
      });
    } else if (role === Role.TEACHER) {
      await prisma.user.create({
        data: {
          email,
          username,
          password: passwordHash,
          role,
          firstName,
          lastName,
          name: fullName,
          contract: { 
            create: { 
              hourlyRate: 0,
              annualHours: 0
            } 
          },
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          username,
          password: passwordHash,
          role,
          firstName,
          lastName,
          name: fullName,
        },
      });
    }
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Un compte existe déjà avec cet e-mail ou cet identifiant." };
    }
    return { ok: false, error: "Impossible de créer l’utilisateur." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(input: {
  userId: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
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
    isActive,
    newPassword,
    studentClassId,
  } = input;

  const email = emailRaw?.trim() ? emailRaw.trim().toLowerCase() : null;
  const firstName = fnRaw.trim();
  const lastName = lnRaw.trim();

  if (!userId || !firstName || !lastName) {
    return { ok: false, error: "Champs obligatoires manquants." };
  }
  if (!ADMIN_ROLES.includes(newRole)) {
    return { ok: false, error: "Rôle invalide." };
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      contract: true,
    },
  });

  if (!existing) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  let username = existing.username;
  if (!username || existing.firstName !== firstName || existing.lastName !== lastName) {
    username = await generateUniqueUsername(firstName, lastName);
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

  if (existing.contract && newRole !== Role.TEACHER) {
    const courseCount = await prisma.lesson.count({
      where: { teacherId: existing.id },
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

  const fullName = `${firstName} ${lastName}`;

  const data: Prisma.UserUpdateInput = {
    email,
    username,
    firstName,
    lastName,
    name: fullName,
    role: newRole,
    isActive,
  };

  if (newPassword?.trim()) {
    data.password = await bcrypt.hash(newPassword.trim(), 10);
  }

  /** Passage ADMIN/PARENT … → PROF : création profil enseignant. */
  if (newRole === Role.TEACHER && !existing.contract) {
    data.contract = { 
      create: { 
        hourlyRate: 0, 
        monthlyHours: 0 
      } 
    };
  }

  /** Passage sans profil → ÉLÈVE. */
  if (newRole === Role.STUDENT && !existing.studentProfile) {
    data.studentProfile = {
      create: { classId: studentClassId!.trim() },
    };
    data.class = { connect: { id: studentClassId!.trim() } };
  }

  /** Professeur sans cours → autre rôle : retirer le profil Teacher. */
  if (existing.contract && newRole !== Role.TEACHER) {
    data.contract = { delete: true };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data,
    });

    /** Si élève existe : mettre à jour la classe uniquement lorsque reste STUDENT et fourni classId différent intention */
    if (newRole === Role.STUDENT && existing.studentProfile && studentClassId?.trim()) {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          classId: studentClassId.trim(),
          studentProfile: {
            update: { classId: studentClassId.trim() }
          }
        },
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
      // Relation 1 : Le profil étudiant (directement sur User)
      studentProfile: true, 
    
      // Relation 2 : Le contrat prof (directement sur User)
      contract: true, 
    
      // Relation 3 : Le décompte (directement sur User)
      _count: {
        select: {
          lessons: true, 
        },
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
  if (existing.contract && existing._count?.lessons > 0) {
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
    if (existing.contract) {
      await tx.teacherContract.delete({ 
        where: { teacherId: userId } 
      });
    }
    await tx.user.delete({ where: { id: userId } });
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function importUsersAction(users: Array<{
  email?: string;
  firstName: string;
  lastName: string;
  role: Role;
  classId?: string;
  password?: string;
}>): Promise<MutationResult<{ count: number }>> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Accès réservé aux administrateurs." };

  let count = 0;
  for (const user of users) {
    const email = user.email?.trim() ? user.email.trim().toLowerCase() : null;
    const firstName = user.firstName.trim();
    const lastName = user.lastName.trim();
    const fullName = `${firstName} ${lastName}`;
    const role = user.role;
    const password = user.password || "Skilla2026!";

    if (!firstName || !lastName || !role) continue;

    const passwordHash = await bcrypt.hash(password, 10);
    const generatedUsername = await generateUniqueUsername(firstName, lastName);

    try {
      let existingUser = null;
      if (email) {
        existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { username: generatedUsername }
            ]
          }
        });
      } else {
        existingUser = await prisma.user.findUnique({
          where: { username: generatedUsername }
        });
      }

      if (existingUser) {
        if (role === Role.STUDENT && user.classId) {
          const targetClass = await prisma.class.findFirst({
            where: { OR: [{ id: user.classId }, { name: user.classId }] }
          });
          const classConnect = targetClass ? { connect: { id: targetClass.id } } : undefined;

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              firstName,
              lastName,
              name: fullName,
              role,
              email: email || existingUser.email,
              class: classConnect
            }
          });
        } else {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              firstName,
              lastName,
              name: fullName,
              role,
              email: email || existingUser.email
            }
          });
        }
      } else {
        if (role === Role.STUDENT && user.classId) {
          const targetClass = await prisma.class.findFirst({
            where: { OR: [{ id: user.classId }, { name: user.classId }] }
          });
          if (targetClass) {
            await prisma.user.create({
              data: {
                email,
                username: generatedUsername,
                password: passwordHash,
                role,
                firstName,
                lastName,
                name: fullName,
                class: { connect: { id: targetClass.id } },
                studentProfile: { create: { classId: targetClass.id } }
              }
            });
          }
        } else if (role === Role.TEACHER) {
          await prisma.user.create({
            data: {
              email,
              username: generatedUsername,
              password: passwordHash,
              role,
              firstName,
              lastName,
              name: fullName,
              contract: { create: { hourlyRate: 0, monthlyHours: 0 } }
            }
          });
        } else {
          await prisma.user.create({
            data: {
              email,
              username: generatedUsername,
              password: passwordHash,
              role,
              firstName,
              lastName,
              name: fullName
            }
          });
        }
      }
      count++;
    } catch (e) {
      console.error("Error importing user:", email || generatedUsername, e);
    }
  }

  revalidatePath("/admin/users");
  return { ok: true, data: { count } };
}
