# Guide du Développeur - Plateforme Skilla (ECM Académie)

Ce document sert de guide de référence pour tout développeur souhaitant comprendre, maintenir ou faire évoluer le projet **Skilla**. Il détaille l'architecture générale, la structure des fichiers, le modèle de base de données et le fonctionnement des modules clés.

---

## 1. Architecture Technique & Choix Technologiques

La plateforme **Skilla** est construite sur une stack moderne basée sur React et Next.js :
- **Framework principal** : Next.js 15+ (App Router) pour le rendu hybride (SSR, RSC) et la gestion simplifiée des API.
- **Base de données** : PostgreSQL géré via **Prisma ORM**.
- **Gestion d'état & Requêtes** : React Server Actions pour la mutation de données, et requêtes directes via Prisma Client dans les Server Components.
- **Authentification** : **NextAuth.js** pour la connexion sécurisée par identifiant (username) ou adresse email, et la gestion fine des rôles (RBAC).
- **Notifications** : Système hybride de notifications In-App et de notifications Push (Web Push avec Service Workers).

---

## 2. Structure des Dossiers

Voici l'organisation des principaux dossiers du projet :

```text
├── app/                      # Next.js App Router (Pages, Mises en page, Server Actions et API)
│   ├── actions/              # Server Actions pour la mutation sécurisée des données
│   ├── admin/                # Vues d'administration (Dashboard, Planning, RH, Sanctions...)
│   ├── api/                  # Routes d'API (Intégration d'agendas, webhooks, tâches cron)
│   ├── student/ / prof/ ...  # Espace dédiés par rôles utilisateur
│   ├── layout.tsx            # Mise en page racine de l'application
│   └── page.tsx              # Page d'accueil / redirection initiale
├── components/               # Composants React réutilisables (calendriers, listes de sanctions, formulaires)
├── data/                     # Fichiers de données statiques ou mocks de configuration
├── lib/                      # Utilitaires globaux (connexion Prisma, calculs de KPIs, utilitaires de dates)
├── prisma/                   # Schéma de base de données et scripts de peuplement (seeding)
│   ├── schema.prisma         # Modélisation des tables et relations de la base de données
│   └── scripts/              # Scripts utilitaires d'alimentation en données (CSV, leçons...)
├── public/                   # Fichiers statiques et Service Worker (sw.js)
├── src/                      # Services et logique métier partagée
│   └── services/             # Services TypeScript isolés (gestion de planning, planification automatique)
└── types/                    # Déclarations de types TypeScript globaux (ex: extension de session NextAuth)
```

---

## 3. Rôles et Sécurité (RBAC)

L'application gère une hiérarchie de rôles définie par l'énumération `Role` dans `schema.prisma` :
1. **SUPER_ADMIN** : Accès total à tous les aspects techniques et administratifs de l'école.
2. **ADMIN** : Gestion quotidienne (planning, absences, sanctions, documents, Qualiopi).
3. **TEACHER** : Saisie des notes, appels/absences, planification personnelle, gestion des livrets de compétences.
4. **STUDENT** : Consultation de l'agenda, des notes, des sanctions, participation aux mini-jeux éducatifs.
5. **RESPONSIBLE** : Parents ou tuteurs légaux (consultation des notes, planning, absences de leurs enfants liés).
6. **COMPANY_TUTOR** : Tuteurs en entreprise pour les alternants (suivi de la progression en entreprise).

### Habilitations Spécifiques
En plus du rôle, le modèle `User` contient des colonnes booléennes d'habilitations pour affiner les accès :
- `canAccessLivrets` : Droit d'écriture/lecture sur le livret d'apprentissage.
- `canManageUsers` : Droit de créer/modifier des utilisateurs.
- `canManageSettings` : Accès aux configurations globales de l'école.
- `canManagePlanning` : Droit de planifier et d'éditer les cours.
- `canManageRH` : Droit de modifier les tarifs horaires et contrats enseignants.
- `canImpersonate` : Permet à un administrateur d'usurper l'identité d'un autre utilisateur pour le support technique.

---

## 4. Modules Métier Majeurs

### A. Gestion du Planning (Schedules & Subscriptions)
La gestion du temps est structurée autour des modèles `Lesson`, `Class`, `Subject`, `Room`, `SchoolYear` et `Semester` :
- **Détection des Conflits** (`src/services/planning.service.ts`) : Avant de créer ou de modifier un cours (`Lesson`), le système vérifie si l'enseignant, la salle (`Room`) ou la classe (`Class`) sont déjà réservés sur ce créneau.
- **Planification Automatique par IA** (`src/services/ai-planning.service.ts`) : Algorithme d'attribution optimale des cours pour remplir les exigences d'heures hebdomadaires des classes (`ClassSubjectRequirement`) en respectant les disponibilités des enseignants et les capacités des salles.
- **Remplacements** (`SubstitutionRequest`) : Permet de gérer les demandes de remplacement d'un professeur absent par un autre enseignant disponible.
- **Export Calendrier** : Une route d'exportation d'agenda (`/api/calendar/export?token=...`) génère un flux au format standard ICS pour synchroniser le planning Skilla avec Google Calendar ou Outlook.

### B. Système de Points de Conduite et Sanctions
Un système de discipline basé sur la conduite des élèves :
- **Points de conduite** : Chaque étudiant commence avec un capital (par défaut 100 points, stockés dans `conductPoints`).
- **Création de Sanctions** (`Sanction`) : Les enseignants ou administrateurs créent des sanctions qui retirent un certain nombre de points (`pointsCost`).
- **Seuils d'Alerte** : Si le capital d'un élève descend en dessous de 50 ou 20 points, des événements système (`SanctionActionEvent` de type `THRESHOLD_50` ou `THRESHOLD_20`) sont générés pour notifier automatiquement les administrateurs et parents.
- **Commentaires de Sanction** : Zone d'échange sécurisée sur chaque sanction (`SanctionComment`) pour le suivi pédagogique.

### C. Démarche Qualité (Qualiopi)
Pour répondre aux critères de certification Qualiopi, l'application intègre :
- **Gestion des Réclamations** (`Complaint`) : Permet aux élèves, tuteurs ou parents de soumettre un signalement d'anomalie. Le statut (`OPEN`/`CLOSED`) est suivi sur le tableau de bord administratif.
- **Campagnes de Satisfaction** (`SatisfactionSurveyCampaign` & `SatisfactionSurvey`) : Création de sondages à destination des étudiants, professeurs ou tuteurs pour recueillir des notes sur 5 et des commentaires textuels. Ces données alimentent le KPI de satisfaction moyenne de l'école.
- **Livret de Compétences** (`Evaluation` & `ClassCompetency`) : Évaluation continue des compétences académiques et professionnelles avec une échelle de maîtrise de 1 à 4.

### D. Gamification et Mini-Jeux
Pour stimuler l'assiduité et la régularité :
- **Série de connexions (Streaks)** : Chaque connexion quotidienne incrémente la colonne `loginStreak` de l'utilisateur. Si l'utilisateur passe plus de 36 heures sans se connecter, la série retombe à zéro.
- **Mini-jeux éducatifs** : 6 jeux intégrés (`bonsai-trimmer`, `calligraphy-flow`, `katana-scissors`, `sakura-mix`, `silk-road`, `skin-defense`) permettent d'enregistrer des scores (`GameScore`) afin de générer un classement des élèves.

### E. Système de Communication (Chat)
- Messagerie instantanée privée entre deux participants (`Conversation` unique pour chaque paire d'utilisateurs).
- Les messages (`ChatMessage`) supportent le statut de lecture (`isRead`) pour la gestion des notifications de non-lecture.

---

## 5. Bonnes Pratiques & Flux de Travail

1. **Transactions Prisma** : Pour toute opération complexe impliquant plusieurs tables (par exemple, créer une sanction + mettre à jour les points de l'étudiant + créer un journal d'événement), utilisez toujours une transaction Prisma (`prisma.$transaction([...])`) pour garantir l'intégrité des données en cas d'erreur intermédiaire.
2. **Gestion des dates** : Les dates en base de données PostgreSQL/Prisma sont stockées en UTC. Utilisez systématiquement la bibliothèque `date-fns` pour formater ou comparer les dates en tenant compte du fuseau horaire de l'utilisateur.
3. **Sécurisation des Server Actions** : Ne faites jamais confiance aux paramètres passés à un Server Action. Vérifiez toujours la session de l'utilisateur connecté via `getServerSession(authOptions)` et validez que l'utilisateur possède l'habilitation adéquate (ex: `user.canManagePlanning` ou `user.role === 'ADMIN'`).
