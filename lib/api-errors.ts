import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Convertit une erreur en message affichable sans exposer de détails internes.
 * Les erreurs Prisma (requêtes, contraintes, schéma) sont traduites en messages génériques ;
 * les erreurs levées volontairement par le code (`throw new Error("ID manquant")`) restent lisibles.
 */
export function publicErrorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "Un élément avec ces informations existe déjà.";
      case "P2003":
        return "Opération impossible : cet élément est lié à d'autres données.";
      case "P2025":
        return "Élément introuvable.";
      default:
        return fallback;
    }
  }
  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return fallback;
  }
  if (error instanceof SyntaxError) {
    return "Requête invalide.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

/** Réponse JSON d'erreur pour les routes API : journalise le détail côté serveur, renvoie un message sûr. */
export function apiErrorResponse(error: unknown, status = 400, context?: string) {
  console.error(`[api]${context ? ` ${context}` : ""}`, error);
  return NextResponse.json({ error: publicErrorMessage(error) }, { status });
}
