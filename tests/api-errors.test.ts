import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { publicErrorMessage } from "@/lib/api-errors";

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Invalid `prisma.user.create()` invocation: secret details", {
    code,
    clientVersion: "test",
  });
}

describe("publicErrorMessage", () => {
  it("traduit les erreurs Prisma connues sans exposer leur détail", () => {
    expect(publicErrorMessage(knownError("P2002"))).toBe("Un élément avec ces informations existe déjà.");
    expect(publicErrorMessage(knownError("P2025"))).toBe("Élément introuvable.");
    expect(publicErrorMessage(knownError("P9999"))).not.toContain("prisma");
  });

  it("masque les erreurs de validation Prisma", () => {
    const err = new Prisma.PrismaClientValidationError("Argument `id` is missing.", { clientVersion: "test" });
    expect(publicErrorMessage(err)).toBe("Une erreur est survenue.");
  });

  it("garde les messages levés volontairement par le code", () => {
    expect(publicErrorMessage(new Error("ID manquant"))).toBe("ID manquant");
  });

  it("signale un JSON invalide sans détail", () => {
    expect(publicErrorMessage(new SyntaxError("Unexpected token < in JSON"))).toBe("Requête invalide.");
  });
});
