// ... existing imports
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { unstable_cache, revalidateTag } from "next/cache";

// --- EXISTING FUNCTIONS (unchanged) ---
// ... (rest of the file remains as it was)

// --- NEW GDPR FUNCTIONS ---

export async function exportUserData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const userData = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: true,
      grades: true,
      absences: true,
      reportCards: true,
      gameScores: true,
    },
  });

  return JSON.stringify(userData, null, 2);
}

export async function requestAccountDeletion() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { deletionRequested: true },
  });

  return { ok: true };
}

}
