import prisma from "@/lib/prisma";

/**
 * Retourne l'ID du professeur effectif pour un utilisateur.
 * Si l'utilisateur est un Admin ou Super Admin et qu'il possède un compte professeur lié (linkedTeacherId),
 * cette fonction renvoie le linkedTeacherId. Sinon, elle renvoie le userId d'origine.
 */
export async function getEffectiveTeacherId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, linkedTeacherId: true }
  });
  if (!user) return userId;
  if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && user.linkedTeacherId) {
    return user.linkedTeacherId;
  }
  return userId;
}

/**
 * Retourne le profil utilisateur effectif (nom, id) pour l'espace professeur.
 */
export async function getEffectiveTeacherUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      linkedTeacherId: true,
      firstName: true,
      lastName: true,
      name: true,
      linkedTeacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!user) return null;

  if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && user.linkedTeacher) {
    return {
      ...user.linkedTeacher,
      isLinkedAdmin: true,
      adminId: user.id
    };
  }

  return {
    ...user,
    isLinkedAdmin: false,
    adminId: null
  };
}
