-- Les permissions fines (utilisateurs, paramètres, planning, RH) sont désormais appliquées.
-- Pour ne retirer aucun accès au déploiement, on les accorde à tous les ADMIN existants ;
-- l'administrateur général peut ensuite les retirer compte par compte.
-- Les ADMIN créés après cette migration démarrent sans permission fine.
UPDATE "User"
SET "canManageUsers" = true,
    "canManageSettings" = true,
    "canManagePlanning" = true,
    "canManageRH" = true
WHERE "role" = 'ADMIN';
