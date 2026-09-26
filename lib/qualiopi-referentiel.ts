/**
 * Référentiel National Qualité (RNQ - Qualiopi)
 * Guide exhaustif des 7 Critères et 32 Indicateurs officiels.
 * Structuré pour le pilotage, l'auto-diagnostic et la préparation sereine de l'audit.
 */

export type QualiopiCriterion = {
  id: number;
  title: string;
  description: string;
  badge: string;
};

export type QualiopiIndicatorFull = {
  id: number; // 1 à 32
  criterionId: number; // 1 à 7
  title: string;
  requirement: string; // Exigence officielle du guide de lecture ministériel
  appliesTo: "ALL" | "CFA_ONLY" | "CERTIFYING_ONLY";
  appliesToLabel: string;
  nonConformityType: "MAJEURE" | "MINEURE_OU_MAJEURE";
  isSkillaAutomated: boolean;
  skillaContribution?: string; // Ce que Skilla fait automatiquement
  expectedProofs: string[]; // Liste des preuves concrètes attendues le jour J
  auditorQuestions: string[]; // Questions types posées par l'auditeur
  trapsToAvoid: string[]; // Pièges fréquents constatés en audit
  actionChecklist: string[]; // Tâches d'auto-évaluation à valider
};

export const QUALIOPI_CRITERIA: QualiopiCriterion[] = [
  {
    id: 1,
    title: "Information du public",
    description: "Les conditions d'information du public sur les prestations proposées, leurs délais d'accès et les résultats obtenus.",
    badge: "Indicateurs 1 à 3",
  },
  {
    id: 2,
    title: "Conception et adaptation",
    description: "L'identification précise des objectifs des prestations proposées et l'adaptation de ces prestations aux publics bénéficiaires.",
    badge: "Indicateurs 4 à 8",
  },
  {
    id: 3,
    title: "Accompagnement et suivi",
    description: "L'adaptation aux publics bénéficiaires des prestations et des modalités d'accueil, d'accompagnement, de suivi et d'évaluation.",
    badge: "Indicateurs 9 à 16",
  },
  {
    id: 4,
    title: "Moyens pédagogiques et techniques",
    description: "L'adéquation des moyens pédagogiques, techniques et d'encadrement aux prestations mises en œuvre.",
    badge: "Indicateurs 17 à 20",
  },
  {
    id: 5,
    title: "Qualification des personnels",
    description: "La qualification et le développement des connaissances et compétences des personnels chargés de mettre en œuvre les prestations.",
    badge: "Indicateurs 21 à 22",
  },
  {
    id: 6,
    title: "Inscription dans son environnement",
    description: "L'inscription et l'investissement du prestataire dans son environnement professionnel (veilles et handicap).",
    badge: "Indicateurs 23 à 29",
  },
  {
    id: 7,
    title: "Appréciations et amélioration continue",
    description: "Le recueil et la prise en compte des appréciations et des réclamations formulées par les parties prenantes.",
    badge: "Indicateurs 30 à 32",
  },
];

export const QUALIOPI_INDICATORS: QualiopiIndicatorFull[] = [
  // --- CRITÈRE 1 ---
  {
    id: 1,
    criterionId: 1,
    title: "Information détaillée sur les prestations",
    requirement: "Le prestataire diffuse une information accessible au public, détaillée et vérifiable sur les prestations proposées : prérequis, objectifs, durée, modalités et délais d'accès, tarifs, contacts, méthodes mobilisées et modalités d'évaluation, accessibilité PSH.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Plaquette de formation ou catalogue en ligne à jour",
      "Fiches programmes détaillant objectifs pédagogiques, prérequis et tarifs",
      "Mention des délais d'accès et coordonnées du référent handicap",
      "Conditions Générales de Vente (CGV) ou règlement intérieur"
    ],
    auditorQuestions: [
      "Où un futur apprenant trouve-t-il les tarifs et les prérequis de vos formations ?",
      "Comment garantissez-vous que les informations diffusées sur votre site sont à jour ?"
    ],
    trapsToAvoid: [
      "Oublier de mentionner les délais d'accès moyens (ex: inscription possible jusqu'à 48h avant le début)",
      "Absence de mention d'accessibilité aux personnes en situation de handicap (PSH)"
    ],
    actionChecklist: [
      "Publier les fiches programmes avec objectifs évaluables",
      "Indiquer clairement les tarifs nets ou conditions de prise en charge OPCO/CPF",
      "Afficher les coordonnées du contact admission et handicap"
    ]
  },
  {
    id: 2,
    criterionId: 1,
    title: "Indicateurs de résultats et diffusion publique",
    requirement: "Le prestataire diffuse des indicateurs de résultats adaptés à la nature des prestations : taux de satisfaction, taux d'assiduité, taux de réussite aux certifications, taux d'insertion professionnelle pour les CFA.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes (spécifique CFA)",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Skilla calcule en temps réel votre taux d'assiduité global certifié, le taux de satisfaction moyen de vos campagnes et le taux de complétion des compétences.",
    expectedProofs: [
      "Page web ou tableau d'affichage des statistiques publiques",
      "Rapport d'audit Skilla 1-Click exporté en PDF",
      "Relevés de taux de passage des examens et taux d'insertion à 6 mois"
    ],
    auditorQuestions: [
      "Quels indicateurs publiez-vous et à quelle fréquence sont-ils actualisés ?",
      "Comment calculez-vous le taux de satisfaction affiché ?"
    ],
    trapsToAvoid: [
      "Afficher des chiffres invérifiables ou sans date de mise à jour",
      "Ne pas distinguer les chiffres d'assiduité et de réussite"
    ],
    actionChecklist: [
      "Générer le rapport d'indicateurs Skilla",
      "Publier le lien ou la synthèse sur votre site internet ou hall d'accueil"
    ]
  },
  {
    id: 3,
    criterionId: 1,
    title: "Information sur les certifications professionnelles",
    requirement: "Lorsque les prestations débouchent sur une certification professionnelle (RNCP/RS), le prestataire informe sur les conditions d'obtention, équivalences et débouchés.",
    appliesTo: "CERTIFYING_ONLY",
    appliesToLabel: "Formations certifiantes / RNCP / RS",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Code RNCP ou RS exact mentionné avec date d'enregistrement",
      "Nom du certificateur officiel (ex: Ministère du Travail, Branche pro)",
      "Détail des blocs de compétences capitalisables et passerelles"
    ],
    auditorQuestions: [
      "Êtes-vous certificateur ou organisme préparateur habilité ?",
      "Avez-vous la convention d'habilitation du certificateur à jour ?"
    ],
    trapsToAvoid: [
      "Confusion entre titre RNCP et certificat interne d'école",
      "Omettre la mention du certificateur officiel"
    ],
    actionChecklist: [
      "Vérifier la validité active de la fiche France Compétences",
      "Intégrer les blocs de compétences dans la description des filières"
    ]
  },

  // --- CRITÈRE 2 ---
  {
    id: 4,
    criterionId: 2,
    title: "Analyse des besoins et adaptation de la prestation",
    requirement: "Le prestataire analyse le besoin du bénéficiaire en amont pour adapter la formation à son profil et ses objectifs professionnels.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Grille de diagnostic ou questionnaire d'analyse des besoins en amont",
      "Entretien d'admission ou compte-rendu de positionnement",
      "Plan individuel de formation personnalisé"
    ],
    auditorQuestions: [
      "Comment recueillez-vous les attentes du futur apprenant avant l'entrée en formation ?",
      "Pouvez-vous me montrer un exemple d'adaptation de parcours suite à cette analyse ?"
    ],
    trapsToAvoid: [
      "Inscrire un apprenant sans aucune trace écrite de son niveau ou de son projet pro"
    ],
    actionChecklist: [
      "Mettre en place une fiche d'analyse du besoin lors du dossier de candidature",
      "Archiver le compte-rendu d'entretien de sélection"
    ]
  },
  {
    id: 5,
    criterionId: 2,
    title: "Définition des objectifs opérationnels et évaluables",
    requirement: "Le prestataire définit les objectifs opérationnels et évaluables de la prestation et les communique aux bénéficiaires.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Dans Skilla, les référentiels de classe (ClassCompetency) permettent de segmenter chaque cours en compétences observables et évaluables.",
    expectedProofs: [
      "Référentiel des compétences de la classe dans Skilla",
      "Syllabus de cours avec verbes d'action opérationnels (ex: 'Être capable de...')",
      "Grille d'évaluation sommative"
    ],
    auditorQuestions: [
      "Comment формуlez-vous les objectifs de vos modules ? Sont-ils observables ?"
    ],
    trapsToAvoid: [
      "Utiliser des formulations vagues comme 'Comprendre le marketing' au lieu de 'Construire un plan média opérationnel'"
    ],
    actionChecklist: [
      "Définir les compétences dans l'onglet Livret / Compétences de Skilla",
      "Associer chaque évaluation à une compétence cible"
    ]
  },
  {
    id: 6,
    criterionId: 2,
    title: "Contenus et modalités pédagogiques adaptés aux objectifs",
    requirement: "Le prestataire établit des contenus et modalités pédagogiques adaptés aux objectifs de la prestation et aux profils des apprenants.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Scénario pédagogique et progression chronologique des cours",
      "Alternance de théorie, cas pratiques, mises en situation et e-learning",
      "Règles d'articulation cours / entreprise"
    ],
    auditorQuestions: [
      "Comment construisez-vous la progression pédagogique sur l'année ?"
    ],
    trapsToAvoid: [
      "Absence de lien logique entre les cours théoriques et les missions en alternance"
    ],
    actionChecklist: [
      "Structurer le calendrier d'alternance selon le rythme (1j/4j, 1sem/3sem)",
      "Valider les plans de cours des enseignants en début de semestre"
    ]
  },
  {
    id: 7,
    criterionId: 2,
    title: "Adéquation des contenus aux exigences des certifications",
    requirement: "Lorsque la prestation est certifiante, le prestataire démontre la conformité de ses enseignements avec le référentiel de certification.",
    appliesTo: "CERTIFYING_ONLY",
    appliesToLabel: "Formations certifiantes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Matrice de correspondance référentiel RNCP vs matières enseignées",
      "PV de conformité signé par le responsable pédagogique"
    ],
    auditorQuestions: [
      "Comment garantissez-vous que 100% des compétences de la fiche RNCP sont enseignées ?"
    ],
    trapsToAvoid: [
      "Compétence du référentiel oubliée dans le programme"
    ],
    actionChecklist: [
      "Tenir à disposition le tableau de mapping RNCP / Matières"
    ]
  },
  {
    id: 8,
    criterionId: 2,
    title: "Positionnement à l'entrée et évaluation des acquis",
    requirement: "Le prestataire prévoit des modalités d'évaluation des prérequis et de positionnement à l'entrée pour individualiser la formation.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Test de positionnement initial (QCM, test technique ou dossier)",
      "Grille de résultats conservée dans le dossier de l'apprenant",
      "Mesures d'adaptation ou dispense de cours le cas échéant"
    ],
    auditorQuestions: [
      "Comment testez-vous le niveau initial de vos étudiants avant le premier cours ?"
    ],
    trapsToAvoid: [
      "Accepter des candidats sans vérifier formellement les prérequis académiques ou techniques"
    ],
    actionChecklist: [
      "Organiser un test de positionnement en début d'année ou lors de l'admission",
      "Archiver les résultats dans le dossier scolaire de chaque élève"
    ]
  },

  // --- CRITÈRE 3 ---
  {
    id: 9,
    criterionId: 3,
    title: "Conditions d'accueil, d'information et règlement intérieur",
    requirement: "Le prestataire informe les bénéficiaires sur les conditions de déroulement de la prestation : livret d'accueil, règlement intérieur, charte informatique, consignes de sécurité.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Livret d'accueil de l'apprenant (téléchargeable / dématérialisé)",
      "Règlement intérieur à jour avec clauses relatives à la discipline",
      "Preuve de signature ou d'émargement du règlement par les élèves"
    ],
    auditorQuestions: [
      "De quelle manière transmettez-vous le règlement intérieur aux étudiants et aux tuteurs ?"
    ],
    trapsToAvoid: [
      "Règlement intérieur obsolète ne mentionnant pas les règles d'hygiène et de sécurité"
    ],
    actionChecklist: [
      "Publier le livret d'accueil et le règlement intérieur dans l'espace étudiant",
      "Conserver une preuve de prise de connaissance (case à cocher ou émargement)"
    ]
  },
  {
    id: 10,
    criterionId: 3,
    title: "Mise en œuvre des évaluations continues et progression",
    requirement: "Le prestataire met en œuvre et trace l'évaluation des acquis et de la progression des apprenants tout au long de la prestation.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Skilla enregistre chaque note, devoir, partiel et validation de compétence dans le livret de compétences dématérialisé accessible en continu.",
    expectedProofs: [
      "Relevés de notes et bulletins semestriels édités sur Skilla",
      "Livret de compétences Skilla avec historique des évaluations",
      "Barème d'évaluation et critères de validation transmis aux élèves"
    ],
    auditorQuestions: [
      "Comment les apprenants savent-ils où ils en sont dans l'acquisition de leurs compétences ?"
    ],
    trapsToAvoid: [
      "Notes délivrées sans feedback explicatif ou livret complété uniquement en fin d'année"
    ],
    actionChecklist: [
      "Veiller à ce que les formateurs saisissent leurs notes et livrets dans Skilla chaque mois",
      "Éditer les bulletins de notes semestriels"
    ]
  },
  {
    id: 11,
    criterionId: 3,
    title: "Évaluation de l'assiduité et prévention des ruptures",
    requirement: "Le prestataire évalue l'assiduité des apprenants, identifie les ruptures de parcours et met en œuvre des actions préventives.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Système complet d'émargement numérique par cours, calcul du taux d'assiduité, gestion des justificatifs d'absence, points de conduite et alertes automatiques.",
    expectedProofs: [
      "Feuilles d'émargement numériques horodatées Skilla par créneau de cours",
      "Relevé des absences justifiées / non justifiées avec pièces justificatives",
      "Courriers ou emails de relance automatique envoyés aux élèves et entreprises"
    ],
    auditorQuestions: [
      "Quelle est votre procédure en cas d'absence non justifiée d'un alternant ?",
      "Comment prévenez-vous l'employeur et sous quel délai ?"
    ],
    trapsToAvoid: [
      "Feuilles d'appel papier non signées ou absences non répercutées à l'employeur"
    ],
    actionChecklist: [
      "Exiger l'émargement systématique des cours par les enseignants sur Skilla",
      "Traiter les justificatifs d'absence sous 48h dans le module Absences de Skilla",
      "Déclencher les avertissements de conduite en cas de passage sous les seuils"
    ]
  },
  {
    id: 12,
    criterionId: 3,
    title: "Coordination des apprentissages en entreprise (CFA)",
    requirement: "Le prestataire organise la coordination entre les apprentissages en centre de formation et en entreprise, et accompagne le maître d'apprentissage.",
    appliesTo: "CFA_ONLY",
    appliesToLabel: "Spécifique CFA / Alternance",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Skilla fournit un portail dédié 'Employeur / Tuteur' avec accès au planning, livret de suivi en entreprise, carnet de liaison et alertes de présence.",
    expectedProofs: [
      "Comptes tuteurs actifs dans Skilla avec conventions rattachées",
      "Comptes-rendus des visites ou rendez-vous tuteurs semestriels",
      "Livret d'apprentissage numérique partagé entre école, tuteur et élève"
    ],
    auditorQuestions: [
      "Comment communiquez-vous avec les maîtres d'apprentissage ?",
      "À quelle fréquence réalisez-vous les bilans de suivi en entreprise ?"
    ],
    trapsToAvoid: [
      "Tuteur d'entreprise qui n'a aucun accès ou aucun contact avec le CFA pendant l'année"
    ],
    actionChecklist: [
      "Renseigner l'email de chaque maître d'apprentissage dans les contrats Skilla",
      "Faire viser le livret d'apprentissage par le tuteur au moins deux fois par an"
    ]
  },
  {
    id: 13,
    criterionId: 3,
    title: "Coordination des acteurs de l'apprentissage (CFA)",
    requirement: "Le prestataire organise des actions pour coordonner les différents acteurs de l'apprentissage (familles, entreprises, conseillers, missions locales).",
    appliesTo: "CFA_ONLY",
    appliesToLabel: "Spécifique CFA / Alternance",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Skilla intègre le portail Parent / Représentant légal et le portail Entreprise pour un accès direct et unifié.",
    expectedProofs: [
      "Rapports d'échanges avec les familles et employeurs",
      "Compte-rendu de conseils de classe ou bilans pédagogiques transmis aux parents d'élèves mineurs",
      "Partenariats avec les OPCO et acteurs de l'emploi"
    ],
    auditorQuestions: [
      "Comment tenez-vous informés les représentants légaux des apprentis mineurs ?"
    ],
    trapsToAvoid: [
      "Absence de transmission des bulletins aux parents pour les mineurs"
    ],
    actionChecklist: [
      "Associer les comptes parents aux profils étudiants dans Skilla",
      "Diffuser les bulletins de notes par le portail"
    ]
  },
  {
    id: 14,
    criterionId: 3,
    title: "Accompagnement à l'exercice de la citoyenneté (CFA)",
    requirement: "Le prestataire accompagne les apprentis dans le développement de leurs compétences professionnelles et civiques (citoyenneté, transition écologique, égalité).",
    appliesTo: "CFA_ONLY",
    appliesToLabel: "Spécifique CFA / Alternance",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Ateliers ou conférences thématiques (RSE, laïcité, éco-gestes, droits du travail)",
      "Élection des délégués de classe et représentants des apprentis",
      "Supports d'ateliers sur le harcèlement, le cyber-harcèlement et la mixité"
    ],
    auditorQuestions: [
      "Quelles actions citoyennes ou de sensibilisation menez-vous auprès des apprentis ?"
    ],
    trapsToAvoid: [
      "Ne proposer aucun atelier civique au-delà du programme technique pur"
    ],
    actionChecklist: [
      "Consigner au moins deux actions civiques ou de sensibilisation dans l'année",
      "Conserver la liste d'émargement et les supports de l'atelier"
    ]
  },
  {
    id: 15,
    criterionId: 3,
    title: "Accompagnement à la recherche d'entreprise et mobilités (CFA)",
    requirement: "Le prestataire accompagne les apprenants dans leur recherche d'employeur et favorise les mobilités nationales et internationales.",
    appliesTo: "CFA_ONLY",
    appliesToLabel: "Spécifique CFA / Alternance",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Ateliers coaching CV, LinkedIn et simulations d'entretiens",
      "Job dating ou diffusion d'offres d'alternance partenaires",
      "Information sur le programme Erasmus+ ou bourses de mobilité"
    ],
    auditorQuestions: [
      "Comment aidez-vous un candidat inscrit qui n'a pas encore trouvé d'entreprise ?"
    ],
    trapsToAvoid: [
      "Aucune trace de l'aide apportée aux candidats sans contrat"
    ],
    actionChecklist: [
      "Formaliser la procédure d'accompagnement TRE (Techniques de Recherche d'Entreprise)",
      "Nommer un référent mobilité nationale / internationale"
    ]
  },
  {
    id: 16,
    criterionId: 3,
    title: "Conditions de passation des épreuves et certifications",
    requirement: "Le prestataire s'assure des conditions de passation des épreuves conformément aux règles du certificateur.",
    appliesTo: "CERTIFYING_ONLY",
    appliesToLabel: "Formations certifiantes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Skilla génère les attestations d'assiduité, attestations d'examen et procès-verbaux officiels téléchargeables et imprimables en PDF.",
    expectedProofs: [
      "Convocations aux examens horodatées",
      "Procès-verbaux de délibération des jurys avec signature",
      "Certificats de scolarité et attestations de présence Skilla"
    ],
    auditorQuestions: [
      "Comment composez-vous vos jurys d'examen et comment sont-ils convoqués ?"
    ],
    trapsToAvoid: [
      "Jury composé uniquement de formateurs internes sans évaluateurs externes indépendants"
    ],
    actionChecklist: [
      "Éditer les attestations et relevés d'émargement d'épreuves sur Skilla",
      "Archiver les PV de jury signés"
    ]
  },

  // --- CRITÈRE 4 ---
  {
    id: 17,
    criterionId: 4,
    title: "Moyens matériels et plateformes adaptés",
    requirement: "Le prestataire met à disposition des moyens humains et techniques adaptés (locaux, équipements informatiques, plateformes LMS/ERP) et cohérents avec les exigences de la prestation.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "La plateforme Skilla centralise l'ERP, l'émargement numérique, le suivi pédagogique et la relation entreprise avec sécurité et haute disponibilité.",
    expectedProofs: [
      "Fiche descriptive des locaux (salles, capacité, vidéoprojecteurs, réseau WiFi)",
      "Attestation d'utilisation de la plateforme Skilla pour la gestion dématérialisée",
      "Licences logicielles professionnelles mises à disposition des apprenants"
    ],
    auditorQuestions: [
      "Quels outils numériques utilisez-vous pour animer et suivre la formation ?"
    ],
    trapsToAvoid: [
      "Outils logiciels non adaptés aux effectifs ou matériel informatique obsolète"
    ],
    actionChecklist: [
      "Documenter l'inventaire matériel et les accès à Skilla pour chaque classe"
    ]
  },
  {
    id: 18,
    criterionId: 4,
    title: "Coordination et qualification des équipes pédagogiques",
    requirement: "Le prestataire mobilise et coordonne une équipe pédagogique compétente et qualifiée, disposant des compétences adaptées à la prestation.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Matrice de compétences Skilla (SkillMatrix) associant chaque enseignant habilité à sa matière, taux de couverture formateur calculé dans le rapport d'audit.",
    expectedProofs: [
      "Matrice des compétences Skilla (association Professeur - Matière)",
      "Comptes-rendus de réunions de rentrée et réunions pédagogiques d'équipe",
      "Contrats de travail ou conventions de prestation des formateurs"
    ],
    auditorQuestions: [
      "Comment coordonnez-vous vos intervenants pour assurer l'homogénéité des cours ?"
    ],
    trapsToAvoid: [
      "Formateur qui dispense une matière sans justificatif de compétence dans son dossier"
    ],
    actionChecklist: [
      "Associer chaque enseignant à ses matières dans la gestion administrative de Skilla",
      "Consigner le compte-rendu de la réunion pédagogique semestrielle"
    ]
  },
  {
    id: 19,
    criterionId: 4,
    title: "Mise à disposition des ressources pédagogiques",
    requirement: "Le prestataire met à disposition des apprenants des ressources pédagogiques adaptées et leur permet de se les approprier.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MINEURE_OU_MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Supports de cours dématérialisés accessibles aux apprenants",
      "Bibliothèque physique ou numérique (ScholarVox, bases documentaires)",
      "Guides méthodologiques et fiches de révision"
    ],
    auditorQuestions: [
      "Où vos apprenants accèdent-ils aux supports de cours en dehors des séances ?"
    ],
    trapsToAvoid: [
      "Aucun support partagé ou supports non remis à jour"
    ],
    actionChecklist: [
      "Mettre à disposition les supports sur le portail ou dossier partagé",
      "Vérifier l'accessibilité des supports pour les élèves absents"
    ]
  },
  {
    id: 20,
    criterionId: 4,
    title: "Personnel dédié pour la gestion et l'accueil (CFA)",
    requirement: "Le prestataire dispose d'un personnel dédié à l'accueil, l'accompagnement socio-éducatif, la santé et la sécurité des apprentis.",
    appliesTo: "CFA_ONLY",
    appliesToLabel: "Spécifique CFA / Alternance",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Organigramme de l'établissement avec rôles identifiés (chargé d'accueil, CPE, assistante sociale)",
      "Fiche contact du référent santé, sécurité et mixité",
      "Affichage des numéros d'urgence et protocoles d'écoute"
    ],
    auditorQuestions: [
      "Qui s'occupe de l'accompagnement social des alternants en difficulté financière ou de logement ?"
    ],
    trapsToAvoid: [
      "Aucun interlocuteur désigné pour l'accompagnement des apprentis"
    ],
    actionChecklist: [
      "Désigner les référents dans le livret d'accueil et les afficher à l'école"
    ]
  },

  // --- CRITÈRE 5 ---
  {
    id: 21,
    criterionId: 5,
    title: "Compétences des intervenants et sélection rigoureuse",
    requirement: "Le prestataire s'assure de la qualification et de la compétence de ses intervenants internes et sous-traitants.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Dossiers formateurs complets : CV récents, copies des diplômes et certifications",
      "Attestation de compétences professionnelles en lien avec la matière dispensée",
      "Grille d'évaluation des compétences lors du recrutement"
    ],
    auditorQuestions: [
      "Pouvez-vous me présenter les dossiers RH des 3 derniers formateurs recrutés ?"
    ],
    trapsToAvoid: [
      "Dossier formateur avec CV non actualisé ou diplôme manquant (motif n°1 d'écart RH)"
    ],
    actionChecklist: [
      "Constituer un classeur RH / dossier drive avec CV + Diplôme pour 100% des professeurs",
      "Vérifier la concordance entre le diplôme/expérience et la matière affectée dans Skilla"
    ]
  },
  {
    id: 22,
    criterionId: 5,
    title: "Plan de formation continue des personnels",
    requirement: "Le prestataire entretient et développe les compétences de ses salariés et formateurs par des actions de formation continue.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MINEURE_OU_MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Plan de développement des compétences de l'organisme",
      "Attestations de participation à des formations, webinaires ou séminaires des profs",
      "Entretiens professionnels annuels réalisés"
    ],
    auditorQuestions: [
      "Quelles formations vos enseignants ont-ils suivies sur les 12 derniers mois ?"
    ],
    trapsToAvoid: [
      "Aucune trace de formation suivie par les intervenants permanents"
    ],
    actionChecklist: [
      "Recenser les formations suivies par l'équipe pédagogique et administrative",
      "Archiver les attestations de fin de formation"
    ]
  },

  // --- CRITÈRE 6 ---
  {
    id: 23,
    criterionId: 6,
    title: "Veille légale et réglementaire",
    requirement: "Le prestataire réalise une veille légale et réglementaire sur le champ de la formation professionnelle et de l'apprentissage, et en exploite les enseignements.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Abonnements à des flux de veille (Centre Inffo, France Compétences, DGEFP)",
      "Journal de veille horodaté avec note d'impact : 'Qu'est-ce que ce texte a changé chez nous ?'",
      "Mise à jour des process internes suite à une évolution légale"
    ],
    auditorQuestions: [
      "Montrez-moi votre veille légale récente et comment elle s'est traduite concrètement dans vos pratiques."
    ],
    trapsToAvoid: [
      "Présenter uniquement des newsletters reçues sans démontrer leur exploitation concrète"
    ],
    actionChecklist: [
      "Ouvrir un journal de veille trimestriel avec date, sujet légal et action menée pour l'école"
    ]
  },
  {
    id: 24,
    criterionId: 6,
    title: "Veille sur les métiers et compétences sectorielles",
    requirement: "Le prestataire réalise une veille sur les évolutions des métiers, des compétences et des technologies de ses secteurs d'activité.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Participation à des salons professionnels sectoriels, webinaires de branches",
      "Études d'observatoires des métiers (OPIIEC, Atlas, etc.) archivées",
      "Actualisation des contenus de cours suite aux évolutions du marché"
    ],
    auditorQuestions: [
      "Comment vos formateurs se tiennent-ils au courant des évolutions de leur métier ?"
    ],
    trapsToAvoid: [
      "Cours qui utilisent des méthodes ou langages obsolètes sans justification"
    ],
    actionChecklist: [
      "Demander à chaque enseignant une note de veille métier annuelle",
      "Consigner les participations aux salons sectoriels"
    ]
  },
  {
    id: 25,
    criterionId: 6,
    title: "Veille sur les innovations pédagogiques et technologiques",
    requirement: "Le prestataire réalise une veille sur les innovations pédagogiques et les technologies digitales d'apprentissage.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "L'adoption et l'exploitation de la plateforme Skilla (émargement connecté, gamification, livrets dématérialisés) constituent une preuve majeure d'innovation pédagogique.",
    expectedProofs: [
      "Attestation d'intégration de Skilla dans les processus pédagogiques",
      "Mise en place d'outils interactifs, classes inversées, IA ou gamification",
      "Comptes-rendus d'ateliers pédagogiques internes"
    ],
    auditorQuestions: [
      "Comment intégrez-vous le numérique et les nouvelles approches dans votre pédagogie ?"
    ],
    trapsToAvoid: [
      "Pédagogie 100% magistrale sans exploitation des outils modernes"
    ],
    actionChecklist: [
      "Valoriser l'utilisation de Skilla et des outils interactifs dans le rapport d'audit"
    ]
  },
  {
    id: 26,
    criterionId: 6,
    title: "Accueil et accompagnement des personnes en situation de handicap (PSH)",
    requirement: "Le prestataire mobilise des compétences et des réseaux de partenaires spécialisés pour accueillir, accompagner et aménager les parcours des personnes en situation de handicap.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes (Obligatoire)",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Nomination officielle du Référent Handicap avec coordonnées directes",
      "Protocole d'accueil et registre d'accessibilité de l'établissement",
      "Partenariats identifiés avec Agefiph, Cap Emploi, MDPH ou CRFH",
      "Aménagements d'épreuves (tiers-temps, adaptations) tracés"
    ],
    auditorQuestions: [
      "Qui est votre référent handicap et comment un apprenant PSH peut-il le contacter ?",
      "Comment adaptez-vous une épreuve si un apprenant a un aménagement tiers-temps ?"
    ],
    trapsToAvoid: [
      "Ne pas avoir de référent handicap désigné ou ne pas connaître les acteurs spécialisés (Agefiph/Cap Emploi)"
    ],
    actionChecklist: [
      "Renseigner les coordonnées du référent handicap sur le site et le livret d'accueil",
      "Formaliser la convention ou fiche contact avec l'Agefiph / Cap Emploi"
    ]
  },
  {
    id: 27,
    criterionId: 6,
    title: "Respect de la conformité par les sous-traitants",
    requirement: "Lorsque le prestataire fait appel à la sous-traitance ou au portage, il s'assure du respect du référentiel par ses partenaires.",
    appliesTo: "ALL",
    appliesToLabel: "Si recours à la sous-traitance",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Contrats de sous-traitance avec clause d'adhésion au respect de Qualiopi",
      "Vérification de la certification Qualiopi du sous-traitant (obligatoire depuis 2024)",
      "Grille d'évaluation qualité des prestations sous-traitées"
    ],
    auditorQuestions: [
      "Faites-vous appel à des formateurs auto-entrepreneurs ou sous-traitants ? Sont-ils certifiés Qualiopi ?"
    ],
    trapsToAvoid: [
      "Recourir à un organisme sous-traitant non certifié Qualiopi pour des formations CPF"
    ],
    actionChecklist: [
      "Vérifier les certificats Qualiopi des partenaires sous-traitants",
      "Intégrer les clauses Qualiopi dans les contrats cadres"
    ]
  },
  {
    id: 28,
    criterionId: 6,
    title: "Périodes en entreprise et suivi de l'immersion (CFA)",
    requirement: "Le prestataire organise la période de formation en milieu professionnel et en assure le suivi régulier.",
    appliesTo: "CFA_ONLY",
    appliesToLabel: "Spécifique CFA / Alternance",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Dans Skilla, suivi des conventions de stage et contrats d'apprentissage avec liaison tuteur et carnet de bord numérique.",
    expectedProofs: [
      "Conventions de stage ou CERFA d'apprentissage enregistrés",
      "Planning des rendez-vous de suivi en entreprise",
      "Fiches de bilan de mi-parcours en entreprise"
    ],
    auditorQuestions: [
      "Comment validez-vous la cohérence entre les missions confiées en entreprise et le référentiel de diplôme ?"
    ],
    trapsToAvoid: [
      "Missions en entreprise non adaptées au diplôme préparé sans réajustement du CFA"
    ],
    actionChecklist: [
      "Faire signer la fiche de validation des missions en début de contrat"
    ]
  },
  {
    id: 29,
    criterionId: 6,
    title: "Insertion professionnelle et poursuite d'études (CFA)",
    requirement: "Le prestataire développe des actions pour favoriser l'insertion professionnelle et la poursuite d'études des apprenants.",
    appliesTo: "CFA_ONLY",
    appliesToLabel: "Spécifique CFA / Alternance",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: false,
    expectedProofs: [
      "Réseau des anciens élèves (Alumni) ou forum emploi",
      "Partenariats avec des écoles supérieures pour les poursuites d'études",
      "Enquêtes d'insertion professionnelle à 6 mois et 12 mois post-diplôme"
    ],
    auditorQuestions: [
      "Quel est le devenir de vos diplômés de la dernière promotion ?"
    ],
    trapsToAvoid: [
      "Perdre le contact avec les diplômés dès la fin des épreuves sans mesure d'insertion"
    ],
    actionChecklist: [
      "Envoyer une enquête d'insertion à 6 mois via le module Enquêtes de Skilla"
    ]
  },

  // --- CRITÈRE 7 ---
  {
    id: 30,
    criterionId: 7,
    title: "Recueil des appréciations des parties prenantes",
    requirement: "Le prestataire recueille les appréciations des apprenants, des formateurs, des entreprises et des financeurs.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Diffusion multicanal d'enquêtes de satisfaction Skilla avec ciblage différencié (Élèves, Enseignants, Tuteurs entreprise, Parents), alertes in-app et push web.",
    expectedProofs: [
      "Campagnes d'enquêtes actives et archivées dans Skilla",
      "Rapports de résultats et moyennes par cible",
      "Taux de retour et synthèse statistique des avis recueillis"
    ],
    auditorQuestions: [
      "À quels moments recueillez-vous les avis des alternants et des maîtres d'apprentissage ?",
      "Quel est votre taux de réponse moyen ?"
    ],
    trapsToAvoid: [
      "N'interroger que les apprenants et oublier les tuteurs d'entreprise ou les professeurs"
    ],
    actionChecklist: [
      "Lancer au moins une campagne élèves par semestre dans Skilla",
      "Lancer une campagne spécifique tuteurs entreprise au cours de l'année"
    ]
  },
  {
    id: 31,
    criterionId: 7,
    title: "Traitement des réclamations formulées par les parties prenantes",
    requirement: "Le prestataire met en œuvre des modalités de traitement des réclamations formulées par les bénéficiaires et financeurs.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes (Obligatoire)",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Guichet universel de réclamation sur Skilla (/reclamation), accusé de réception automatique, registre officiel horodaté et suivi des statuts en temps réel.",
    expectedProofs: [
      "Formulaire public/usagers de réclamation accessible sur Skilla",
      "Registre numérique officiel des réclamations et délais de réponse",
      "Preuves de notification des usagers et courriers de résolution"
    ],
    auditorQuestions: [
      "Montrez-moi comment un élève ou un tuteur dépose une réclamation sur votre plateforme.",
      "Où consignez-vous les réclamations et comment sont-elles instruites ?"
    ],
    trapsToAvoid: [
      "Affirmer 'Nous n'avons jamais eu de réclamation' sans registre de suivi : l'auditeur exige la preuve que le dispositif existe !"
    ],
    actionChecklist: [
      "Vérifier l'accessibilité du lien 'Réclamations' dans les portails Skilla",
      "Traiter et clôturer les réclamations ouvertes avec une mention explicative"
    ]
  },
  {
    id: 32,
    criterionId: 7,
    title: "Plan d'amélioration continue et mesures correctives",
    requirement: "Le prestataire met en œuvre des démarches d'amélioration continue à partir de l'analyse des appréciations, des réclamations et des aléas.",
    appliesTo: "ALL",
    appliesToLabel: "Tous organismes",
    nonConformityType: "MAJEURE",
    isSkillaAutomated: true,
    skillaContribution: "Plan d'actions correctives Skilla, boucle de rétroaction entre réclamations/enquêtes et mesures administratives concrètes.",
    expectedProofs: [
      "Plan d'Amélioration Continue (PAC) avec actions, responsables et dates cibles",
      "Compte-rendu de revue de direction annuelle ou bilan qualité",
      "Preuves d'ajustements de process réalisés suite aux retours d'enquêtes"
    ],
    auditorQuestions: [
      "Donnez-moi un exemple concret d'action corrective mise en place suite à une mauvaise note d'enquête ou une réclamation."
    ],
    trapsToAvoid: [
      "Recueillir des enquêtes ou des réclamations sans jamais en tirer de plan d'action"
    ],
    actionChecklist: [
      "Enregistrer les actions correctives sur les réclamations dans Skilla",
      "Présenter la revue d'amélioration continue à l'auditeur"
    ]
  }
];

/**
 * Calcul des statistiques du référentiel RNQ.
 */
export function getQualiopiReferentielStats() {
  const total = QUALIOPI_INDICATORS.length;
  const automated = QUALIOPI_INDICATORS.filter((i) => i.isSkillaAutomated).length;
  const cfaOnly = QUALIOPI_INDICATORS.filter((i) => i.appliesTo === "CFA_ONLY").length;
  const majorOnly = QUALIOPI_INDICATORS.filter((i) => i.nonConformityType === "MAJEURE").length;

  return {
    totalIndicators: total,
    automatedBySkilla: automated,
    automatedPct: Math.round((automated / total) * 100),
    cfaSpecific: cfaOnly,
    majorIndicators: majorOnly,
    criteriaCount: QUALIOPI_CRITERIA.length,
  };
}
