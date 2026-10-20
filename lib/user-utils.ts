/**
 * Standard utility to format user names as NOM + Prénom (en entier)
 * Example: "DUPONT Jean"
 */

export function formatUserName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "Utilisateur"
): string {
  const cleanLast = (lastName || "").trim();
  const cleanFirst = (firstName || "").trim();

  if (cleanLast && cleanFirst) {
    return `${cleanLast.toUpperCase()} ${cleanFirst}`;
  }
  if (cleanLast) {
    return cleanLast.toUpperCase();
  }
  if (cleanFirst) {
    return cleanFirst;
  }
  return fallback;
}

/**
 * Alias for students
 */
export function formatStudentName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "Élève"
): string {
  return formatUserName(firstName, lastName, fallback);
}

/**
 * Alias for teachers
 */
export function formatTeacherName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "Sans prof"
): string {
  return formatUserName(firstName, lastName, fallback);
}
