import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Optimisation Serverless : on s'assure qu'en production, le client ne logge que les erreurs critiques
// La gestion du Pool de Connexion est déjà parfaitement déléguée à l'URL Supabase (pgbouncer=true)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
