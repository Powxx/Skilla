"use server";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { formatUserName } from "@/lib/user-utils";

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

/** Seul un SUPER_ADMIN ou l'Administrateur Général peut attribuer ou modifier un compte SUPER_ADMIN. */
function canManageSuperAdmins(session: Awaited<ReturnType<typeof requireAdmin>>): boolean {
  return Boolean(
    session?.user?.role === "SUPER_ADMIN" ||
    (session?.user as any)?.isGeneralAdmin
  );
}

const SUPER_ADMIN_FORBIDDEN = "Seul un Super Admin peut attribuer ou modifier un compte Super Admin.";

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
  isGeneralAdmin?: boolean;
  isActive?: boolean;
}): Promise<MutationResult> {
  const session = await requireAdmin();
  const isGenAdmin = Boolean(
    (session?.user as any)?.isGeneralAdmin ||
    session?.user?.role === "SUPER_ADMIN"
  );
  if (!isGenAdmin) {
    return { ok: false, error: "Action réservée à l'Administrateur Général." };
  }

  const { userId, ...data } = input;

  if (session?.user?.role !== "SUPER_ADMIN") {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (target?.role === Role.SUPER_ADMIN) {
      return { ok: false, error: SUPER_ADMIN_FORBIDDEN };
    }
  }

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

async function generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
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
  phone?: string;
  company?: string;
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
  if (role === Role.SUPER_ADMIN && !canManageSuperAdmins(session)) {
    return { ok: false, error: SUPER_ADMIN_FORBIDDEN };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const fullName = formatUserName(firstName, lastName);
  const username = await generateUniqueUsername(firstName, lastName);

  try {
    const phone = input.phone?.trim() || null;
    const company = role === Role.COMPANY_TUTOR ? (input.company?.trim() || null) : null;

    if (role === Role.STUDENT) {
      const classId = input.classId?.trim() || null;
      if (classId) {
        const classe = await prisma.class.findUnique({
          where: { id: classId },
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
            phone,
            company,
            class: { connect: { id: classe.id } }, // Important pour le planning élève
            studentProfile: { create: { classId: classe.id } },
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
            phone,
            company,
            studentProfile: { create: { classId: null } },
          },
        });
      }
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
          phone,
          company,
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
          phone,
          company,
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
  phone?: string;
  company?: string;
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
    phone,
    company,
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

  if ((existing.role === Role.SUPER_ADMIN || newRole === Role.SUPER_ADMIN) && !canManageSuperAdmins(session)) {
    return { ok: false, error: SUPER_ADMIN_FORBIDDEN };
  }

  let username = existing.username;
  if (!username) {
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
    if (cid) {
      const classe = await prisma.class.findUnique({ where: { id: cid } });
      if (!classe) return { ok: false, error: "Classe introuvable." };
    }
  }

  const fullName = formatUserName(firstName, lastName);

  const data: Prisma.UserUpdateInput = {
    email,
    username,
    firstName,
    lastName,
    name: fullName,
    role: newRole,
    isActive,
    phone: phone?.trim() || null,
    company: newRole === Role.COMPANY_TUTOR ? (company?.trim() || null) : null,
  };

  if (newPassword?.trim()) {
    data.password = await bcrypt.hash(newPassword.trim(), 10);
  }

  /** Passage ADMIN/PARENT … → PROF : création profil enseignant. */
  if (newRole === Role.TEACHER && !existing.contract) {
    data.contract = { 
      create: { 
        hourlyRate: 0, 
        annualHours: 0 
      } 
    };
  }

  /** Passage sans profil → ÉLÈVE. */
  if (newRole === Role.STUDENT && !existing.studentProfile) {
    const cid = studentClassId?.trim() || null;
    data.studentProfile = {
      create: { classId: cid },
    };
    if (cid) {
      data.class = { connect: { id: cid } };
    }
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

    /** Si élève existe : mettre à jour la classe quand le rôle est STUDENT */
    if (newRole === Role.STUDENT && existing.studentProfile) {
      const cid = studentClassId?.trim() || null;
      await prisma.user.update({
        where: { id: userId },
        data: { 
          classId: cid,
          studentProfile: {
            update: { classId: cid }
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

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true, 
        contract: true, 
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

    if (existing.role === Role.SUPER_ADMIN && !canManageSuperAdmins(session)) {
      return { ok: false, error: SUPER_ADMIN_FORBIDDEN };
    }

    if (existing.contract && existing._count?.lessons > 0) {
      return {
        ok: false,
        error: "Ce professeur a encore des cours planifiés : suppression impossible.",
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
      // 1. Profil étudiant
      await tx.studentProfile.deleteMany({ where: { userId } });

      // 2. Contrat prof & disponibilités & compétences
      await tx.teacherContract.deleteMany({ where: { teacherId: userId } });
      await tx.teacherAvailability.deleteMany({ where: { teacherId: userId } });
      await tx.skillMatrix.deleteMany({ where: { teacherId: userId } });

      // 3. Contrats entreprise (alternance / stage)
      await tx.companyContract.deleteMany({
        where: {
          OR: [{ studentId: userId }, { tutorId: userId }]
        }
      });

      // 4. Pédagogie élève (notes, présences/absences, bulletins, évaluations, dispenses, devoirs)
      await tx.attendance.deleteMany({ where: { studentId: userId } });
      await tx.grade.deleteMany({ where: { studentId: userId } });
      await tx.grade.updateMany({ where: { teacherId: userId }, data: { teacherId: null } });
      await tx.reportCard.deleteMany({ where: { studentId: userId } });
      await tx.evaluation.deleteMany({ where: { studentId: userId } });
      await tx.dispensation.deleteMany({ where: { studentId: userId } });
      await tx.homeworkCompletion.deleteMany({ where: { studentId: userId } });

      // 5. Qualiopi, Enquêtes, Plaintes, Réunions
      await tx.complaint.deleteMany({ where: { senderId: userId } });
      await tx.meetingRequest.deleteMany({ where: { senderId: userId } });
      await tx.satisfactionSurvey.deleteMany({ where: { userId } });
      await tx.satisfactionSurveyCampaign.deleteMany({ where: { createdById: userId } });

      // 6. Notifications & Web Push
      await tx.notification.deleteMany({ where: { userId } });
      await tx.classNotificationLog.deleteMany({ where: { senderId: userId } });
      await tx.scheduledNotification.deleteMany({
        where: { OR: [{ senderId: userId }, { targetUserId: userId }] }
      });
      await tx.pushSubscription.deleteMany({ where: { userId } });

      // 7. Sanctions & Discipline
      await tx.sanctionComment.deleteMany({ where: { authorId: userId } });
      await tx.sanctionActionEvent.deleteMany({ where: { studentId: userId } });
      const userSanctionIds = (await tx.sanction.findMany({
        where: { OR: [{ studentId: userId }, { givenById: userId }] },
        select: { id: true }
      })).map(s => s.id);

      if (userSanctionIds.length > 0) {
        await tx.sanctionComment.deleteMany({ where: { sanctionId: { in: userSanctionIds } } });
        await tx.sanctionActionEvent.deleteMany({ where: { sanctionId: { in: userSanctionIds } } });
        await tx.sanction.deleteMany({ where: { id: { in: userSanctionIds } } });
      }

      // 8. Gamification & Boîte à Idées
      await tx.gameScore.deleteMany({ where: { userId } });
      await tx.adminIdeaVote.deleteMany({ where: { userId } });
      const authorIdeaIds = (await tx.adminIdea.findMany({
        where: { authorId: userId },
        select: { id: true }
      })).map(i => i.id);

      if (authorIdeaIds.length > 0) {
        await tx.adminIdeaVote.deleteMany({ where: { ideaId: { in: authorIdeaIds } } });
        await tx.adminIdea.deleteMany({ where: { id: { in: authorIdeaIds } } });
      }

      // 9. Chat & Messagerie
      await tx.chatMessage.deleteMany({ where: { senderId: userId } });
      const userConvs = (await tx.conversation.findMany({
        where: { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
        select: { id: true }
      })).map(c => c.id);

      if (userConvs.length > 0) {
        await tx.chatMessage.deleteMany({ where: { conversationId: { in: userConvs } } });
        await tx.conversation.deleteMany({ where: { id: { in: userConvs } } });
      }

      // 10. Remplacements de cours & liaisons enseignants/admins
      await tx.substitutionRequest.deleteMany({
        where: { OR: [{ originalTeacherId: userId }, { substituteTeacherId: userId }] }
      });
      await tx.lesson.updateMany({
        where: { substituteId: userId },
        data: { substituteId: null }
      });
      await tx.user.updateMany({
        where: { linkedTeacherId: userId },
        data: { linkedTeacherId: null }
      });

      // 11. Suppression définitive du compte utilisateur
      await tx.user.delete({ where: { id: userId } });
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression de l'utilisateur."
    };
  }
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
  const defaultPasswordHash = await bcrypt.hash("Skilla2026!", 10);

  for (const user of users) {
    const email = user.email?.trim() ? user.email.trim().toLowerCase() : null;
    const firstName = user.firstName.trim();
    const lastName = user.lastName.trim();
    const fullName = formatUserName(firstName, lastName);
    const role = user.role;

    if (!firstName || !lastName || !role) continue;
    if (!ADMIN_ROLES.includes(role)) continue;
    if (role === Role.SUPER_ADMIN && !canManageSuperAdmins(session)) continue;

    const passwordHash = user.password && user.password !== "Skilla2026!"
      ? await bcrypt.hash(user.password, 10)
      : defaultPasswordHash;

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
        if (existingUser.role === Role.SUPER_ADMIN && !canManageSuperAdmins(session)) continue;
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
              contract: { create: { hourlyRate: 0, annualHours: 0 } }
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
