import prisma from "@/lib/prisma";

/**
 * Extrait la première valeur d'un paramètre de requête HTTP (Query Parameter).
 * Permet de parer les cas où Next.js renvoie un tableau de chaînes au lieu d'une chaîne unique.
 */
function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * Liste et formate les enfants (étudiants) rattachés à un parent/responsable.
 * 
 * @param parentUserId ID de l'utilisateur ayant le rôle RESPONSIBLE.
 * @returns Tableau d'objets contenant l'ID de l'étudiant et son nom complet formaté.
 */
export async function listParentChildrenSerialized(parentUserId: string) {
  const rows = await prisma.user.findMany({
    where: { responsibles: { some: { id: parentUserId } } },
    orderBy: {
      lastName: "asc",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    label: `${r.lastName} ${r.firstName}`,
  }));
}

/**
 * Résout l'ID de l'étudiant sélectionné pour l'affichage du tableau de bord parent.
 * Si l'ID passé en paramètre URL n'est pas fourni ou s'il ne fait pas partie des enfants
 * rattachés à ce parent, l'ID du premier enfant de la liste est retourné par défaut.
 * 
 * @param parentUserId ID du parent/responsable.
 * @param studentIdParam ID de l'étudiant extrait des paramètres de recherche URL.
 * @returns ID de l'étudiant ou null s'il n'y a aucun enfant rattaché.
 */
export async function resolveParentStudentId(
  parentUserId: string,
  studentIdParam: string | string[] | undefined,
): Promise<string | null> {
  const rows = await prisma.user.findMany({
    where: { responsibles: { some: { id: parentUserId } } },
    orderBy: {
      lastName: "asc",
    },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return null;
  const pref = firstParam(studentIdParam);
  if (pref && ids.includes(pref)) return pref;
  return ids[0] ?? null;
}

/**
 * Vérifie si un parent/responsable est autorisé à consulter les données d'un élève.
 * (Vérifie la présence de la relation parent-enfant dans la base de données).
 * 
 * @param parentUserId ID du parent.
 * @param studentId ID de l'élève à consulter.
 * @returns true si la relation existe, false sinon.
 */
export async function parentOwnsStudent(
  parentUserId: string,
  studentId: string,
): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: {
      id: studentId,
      responsibles: { some: { id: parentUserId } },
    },
    select: { id: true },
  });
  return Boolean(row);
}
