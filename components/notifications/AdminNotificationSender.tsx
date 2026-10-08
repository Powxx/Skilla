"use client";

import { useState, useMemo } from "react";
import { sendAdminNotification } from "@/app/actions/notifications";
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  Building2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Sparkles,
  Loader2,
  Search,
  Bell,
  HeartHandshake,
  Briefcase
} from "lucide-react";

export type TeacherOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export type ClassOption = {
  id: string;
  name: string;
};

interface AdminNotificationSenderProps {
  classes: ClassOption[];
  teachers: TeacherOption[];
}

type AudienceCategory = "TEACHERS" | "STUDENTS" | "PARENTS" | "TUTORS";
type TargetMode = "ALL_TEACHERS" | "TEACHER" | "SCHOOL" | "CLASS" | "ALL_PARENTS" | "ALL_TUTORS";
type NotificationType = "INFO" | "WARNING" | "SUCCESS" | "ERROR";

const NOTIFICATION_TEMPLATES = [
  {
    name: "Alerte Météo / Fermeture",
    type: "ERROR" as NotificationType,
    title: "Alerte Météo : Fermeture exceptionnelle",
    message: "En raison des conditions météorologiques exceptionnelles, l'établissement sera fermé demain. Les cours se dérouleront à distance via l'espace Skilla."
  },
  {
    name: "Rappel Administratif",
    type: "WARNING" as NotificationType,
    title: "Rappel : Transmission des documents requis",
    message: "Merci de bien vouloir déposer vos pièces justificatives en attente auprès du secrétariat ou sur votre espace avant la fin de la semaine."
  },
  {
    name: "Planning / Emploi du temps",
    type: "INFO" as NotificationType,
    title: "Mise à jour de l'emploi du temps",
    message: "Des ajustements ont été apportés à votre planning de la semaine prochaine. Veuillez consulter votre emploi du temps mis à jour sur la plateforme."
  },
  {
    name: "Conseils de classe",
    type: "INFO" as NotificationType,
    title: "Tenue des conseils de classe du semestre",
    message: "Les conseils de classe débuteront la semaine prochaine. Les bulletins de notes et synthèses seront consultables en ligne dès la fin des délibérations."
  },
  {
    name: "Félicitations / Projets",
    type: "SUCCESS" as NotificationType,
    title: "Félicitations aux étudiants !",
    message: "Bravo à l'ensemble des élèves et intervenants pour les excellents résultats et projets présentés cette semaine."
  }
];

export default function AdminNotificationSender({ classes, teachers }: AdminNotificationSenderProps) {
  const [category, setCategory] = useState<AudienceCategory>("TEACHERS");
  const [target, setTarget] = useState<TargetMode>("ALL_TEACHERS");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [teacherSearch, setTeacherSearch] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [includeParents, setIncludeParents] = useState<boolean>(false);
  const [notifType, setNotifType] = useState<NotificationType>("INFO");
  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Bascule de catégorie principale
  const handleCategoryChange = (newCat: AudienceCategory) => {
    setCategory(newCat);
    if (newCat === "TEACHERS") {
      setTarget("ALL_TEACHERS");
    } else if (newCat === "STUDENTS") {
      setTarget("SCHOOL");
    } else if (newCat === "PARENTS") {
      setTarget("ALL_PARENTS");
    } else if (newCat === "TUTORS") {
      setTarget("ALL_TUTORS");
    }
    setFeedback(null);
  };

  // Filtrage des professeurs par recherche
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.toLowerCase();
    return teachers.filter(t => 
      `${t.lastName ?? ""} ${t.firstName ?? ""}`.toLowerCase().includes(q) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  }, [teachers, teacherSearch]);

  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId);
  }, [teachers, selectedTeacherId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!title.trim() || !message.trim()) {
      setFeedback({ type: "error", text: "Veuillez renseigner un titre et un message." });
      return;
    }

    if (target === "TEACHER" && !selectedTeacherId) {
      setFeedback({ type: "error", text: "Veuillez sélectionner un enseignant destinataire." });
      return;
    }

    if (target === "CLASS" && !selectedClassId) {
      setFeedback({ type: "error", text: "Veuillez sélectionner une classe destinataire." });
      return;
    }

    setIsSending(true);
    try {
      const res = await sendAdminNotification({
        target,
        classId: target === "CLASS" ? selectedClassId : undefined,
        teacherId: target === "TEACHER" ? selectedTeacherId : undefined,
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        includeParents: (target === "CLASS" || target === "SCHOOL") ? includeParents : undefined,
      });

      let successMsg = "Notification envoyée avec succès !";
      if (target === "ALL_TEACHERS") {
        successMsg = `Notification envoyée avec succès à tous les professeurs (${res.count} notifié(s)) !`;
      } else if (target === "TEACHER") {
        successMsg = `Notification envoyée avec succès à ${(res as any).recipient || "l'enseignant"} !`;
      } else if (target === "SCHOOL") {
        successMsg = `Notification diffusée à toute l'école (${res.count} destinataire(s)${includeParents ? " incluant les parents" : ""}) !`;
      } else if (target === "CLASS") {
        const cls = classes.find(c => c.id === selectedClassId);
        successMsg = `Notification envoyée à la classe ${cls?.name || ""} (${res.count} destinataire(s)${includeParents ? " incluant les parents" : ""}) !`;
      } else if (target === "ALL_PARENTS") {
        successMsg = `Notification envoyée à tous les parents d'élèves (${res.count} parent(s) notifié(s)) !`;
      } else if (target === "ALL_TUTORS") {
        successMsg = `Notification envoyée à tous les tuteurs d'entreprise (${res.count} tuteur(s) notifié(s)) !`;
      }

      setFeedback({ type: "success", text: successMsg });
      setTitle("");
      setMessage("");
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Erreur lors de l'envoi de la notification." });
    } finally {
      setIsSending(false);
    }
  };

  const typeConfig = {
    INFO: {
      label: "Information",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      activeTabClass: "bg-blue-600 text-white shadow-sm shadow-blue-500/30",
      icon: Info,
      previewBorder: "border-l-blue-500",
    },
    WARNING: {
      label: "Avertissement / Important",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      activeTabClass: "bg-amber-600 text-white shadow-sm shadow-amber-500/30",
      icon: AlertTriangle,
      previewBorder: "border-l-amber-500",
    },
    SUCCESS: {
      label: "Succès / Félicitations",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      activeTabClass: "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30",
      icon: CheckCircle2,
      previewBorder: "border-l-emerald-500",
    },
    ERROR: {
      label: "Urgent / Alerte",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      activeTabClass: "bg-rose-600 text-white shadow-sm shadow-rose-500/30",
      icon: AlertCircle,
      previewBorder: "border-l-rose-500",
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* En-tête avec indicateur */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Diffuser une notification</h2>
            <p className="text-xs text-slate-500">
              Communiquez instantanément avec vos enseignants, élèves, parents et entreprises (in-app et push).
            </p>
          </div>
        </div>

        {/* Sélecteur de groupe cible étendu */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 flex-wrap gap-1">
          <button
            type="button"
            onClick={() => handleCategoryChange("TEACHERS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              category === "TEACHERS"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Enseignants</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-semibold">
              {teachers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange("STUDENTS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              category === "STUDENTS"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Élèves / Classes</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-50 text-sky-700 font-semibold">
              {classes.length} cl.
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange("PARENTS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              category === "PARENTS"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HeartHandshake className="h-3.5 w-3.5" />
            <span>Parents</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange("TUTORS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              category === "TUTORS"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Entreprises</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Modèles de messages rapides */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Modèles de communication rapide
            </span>
            <span className="text-[11px] text-slate-400">Cliquez pour pré-remplir</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => {
                  setTitle(tmpl.title);
                  setMessage(tmpl.message);
                  setNotifType(tmpl.type);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-xs font-semibold text-slate-700 transition shadow-2xs hover:shadow-xs flex items-center gap-1.5"
              >
                <span>{tmpl.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sous-choix de cible */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
            Destinataire(s)
          </label>

          {category === "TEACHERS" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTarget("ALL_TEACHERS")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    target === "ALL_TEACHERS"
                      ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${target === "ALL_TEACHERS" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Tous les professeurs (Groupé)</div>
                    <div className="text-xs text-slate-500">Envoi simultané à l'ensemble de l'équipe pédagogique ({teachers.length} profs)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget("TEACHER")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    target === "TEACHER"
                      ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${target === "TEACHER" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Professeur individuel (Individuelle)</div>
                    <div className="text-xs text-slate-500">Cibler un enseignant en particulier pour un message direct</div>
                  </div>
                </button>
              </div>

              {/* Sélecteur de professeur individuel */}
              {target === "TEACHER" && (
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Sélectionner le professeur :</span>
                    <span className="text-[11px] text-slate-500">{filteredTeachers.length} enseignant(s) disponible(s)</span>
                  </div>

                  {teachers.length > 6 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>
                  )}

                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    required={target === "TEACHER"}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="">-- Choisir un professeur dans la liste --</option>
                    {filteredTeachers.map((t) => {
                      const fullName = `${t.lastName ?? ""} ${t.firstName ?? ""}`.trim() || "Sans nom";
                      return (
                        <option key={t.id} value={t.id}>
                          {fullName} {t.email ? `(${t.email})` : ""}
                        </option>
                      );
                    })}
                  </select>

                  {selectedTeacher && (
                    <div className="flex items-center gap-2 text-xs text-indigo-700 font-medium bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                      <UserCheck className="h-4 w-4 shrink-0 text-indigo-600" />
                      <span>
                        Destinataire sélectionné : <strong>{selectedTeacher.lastName} {selectedTeacher.firstName}</strong> ({selectedTeacher.email})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {category === "STUDENTS" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTarget("SCHOOL")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    target === "SCHOOL"
                      ? "border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${target === "SCHOOL" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Toute l'école (Élèves)</div>
                    <div className="text-xs text-slate-500">Diffusion globale à l'ensemble des élèves actifs</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget("CLASS")}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    target === "CLASS"
                      ? "border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${target === "CLASS" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Par classe spécifique</div>
                    <div className="text-xs text-slate-500">Envoyer uniquement aux étudiants d'une classe</div>
                  </div>
                </button>
              </div>

              {/* Sélecteur de classe */}
              {target === "CLASS" && (
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2 animate-in fade-in duration-150">
                  <span className="text-xs font-bold text-slate-700">Sélectionner la classe cible :</span>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    required={target === "CLASS"}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  >
                    <option value="">-- Choisir une classe dans la liste --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Option notifier les parents */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <input
                  type="checkbox"
                  id="includeParentsCheck"
                  checked={includeParents}
                  onChange={(e) => setIncludeParents(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="includeParentsCheck" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  Notifier également les parents des élèves concernés (si rattachés à un compte responsable)
                </label>
              </div>
            </div>
          )}

          {category === "PARENTS" && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <HeartHandshake className="h-4 w-4 text-emerald-600" />
                <span>Diffusion globale aux parents et représentants légaux</span>
              </div>
              <p className="text-xs text-emerald-700">
                La notification sera transmise à l'ensemble des parents enregistrés sur la plateforme avec compte actif.
              </p>
            </div>
          )}

          {category === "TUTORS" && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <Briefcase className="h-4 w-4 text-amber-600" />
                <span>Diffusion globale aux tuteurs d'entreprises</span>
              </div>
              <p className="text-xs text-amber-700">
                La notification sera transmise à l'ensemble des tuteurs professionnels et maîtres d'apprentissage.
              </p>
            </div>
          )}
        </div>

        {/* Type de notification (esthétique & priorité) */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
            Type d'alerte / Catégorie visuelle
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(["INFO", "WARNING", "SUCCESS", "ERROR"] as NotificationType[]).map((type) => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              const isSelected = notifType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNotifType(type)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? cfg.activeTabClass
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{type === "INFO" ? "Info" : type === "WARNING" ? "Important" : type === "SUCCESS" ? "Succès" : "Urgent"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Titre et Message */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Titre de l'annonce
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  category === "TEACHERS"
                    ? "Ex: Réunion pédagogique, Saisie des livrets..."
                    : category === "PARENTS"
                    ? "Ex: Informations rentrée, Rencontres parents-profs..."
                    : category === "TUTORS"
                    ? "Ex: Calendrier d'alternance, Évaluations en entreprise..."
                    : "Ex: Information importante, Fermeture exceptionnelle..."
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Message détaillé
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rédigez ici le contenu de la notification transmise aux destinataires..."
                rows={4}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-y"
              />
            </div>
          </div>

          {/* Prévisualisation en direct */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Aperçu pour le destinataire
              </span>
              <span className="text-[11px] text-slate-400">Rendu cloche & in-app</span>
            </div>

            <div className={`p-4 rounded-xl border border-slate-200 bg-slate-50/50 border-l-4 ${typeConfig[notifType].previewBorder} space-y-2`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-800">
                    {category === "TEACHERS" ? "Administration" : "Direction / Vie Scolaire"}
                  </span>
                  <span className="text-[10px] text-slate-400">· À l'instant</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeConfig[notifType].badgeClass}`}>
                  {typeConfig[notifType].label}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                {title.trim() || "(Titre de votre notification)"}
              </h4>

              <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-3">
                {message.trim() || "Le corps de votre message apparaîtra ici tel qu'il sera reçu sur l'ordinateur ou le mobile du destinataire."}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Cible : {
                    target === "ALL_TEACHERS" ? `Tous les profs (${teachers.length})` 
                    : target === "TEACHER" ? (selectedTeacher ? `${selectedTeacher.lastName} ${selectedTeacher.firstName}` : "Professeur sélectionné") 
                    : target === "SCHOOL" ? (includeParents ? "Toute l'école + parents" : "Toute l'école (élèves)") 
                    : target === "ALL_PARENTS" ? "Tous les parents d'élèves"
                    : target === "ALL_TUTORS" ? "Tous les tuteurs d'entreprises"
                    : (includeParents ? "Classe + parents" : "Classe")
                  }
                </span>
                <span>Push Web & In-app</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message de feedback / succès / erreur */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <p className="flex-1">{feedback.text}</p>
          </div>
        )}

        {/* Bouton d'action */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>
                  {target === "ALL_TEACHERS"
                    ? `Envoyer à tous les professeurs (${teachers.length})`
                    : target === "TEACHER"
                    ? "Envoyer au professeur"
                    : target === "SCHOOL"
                    ? "Diffuser à toute l'école"
                    : target === "ALL_PARENTS"
                    ? "Envoyer à tous les parents"
                    : target === "ALL_TUTORS"
                    ? "Envoyer aux tuteurs d'entreprise"
                    : "Envoyer à la classe"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
