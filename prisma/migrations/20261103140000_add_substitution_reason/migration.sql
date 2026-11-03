-- Motif d'une demande de remplacement saisi par l'enseignant
ALTER TABLE "SubstitutionRequest" ADD COLUMN IF NOT EXISTS "reason" TEXT;
