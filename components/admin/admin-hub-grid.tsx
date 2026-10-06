"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  BookMarked,
  Clock,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  FileText,
  LayoutDashboard,
  FileCheck,
  Bell,
  MessageSquare,
  Home,
  HeartHandshake,
  Settings,
  Users,
  ClipboardList,
  DoorOpen,
  Briefcase,
  Key,
  UserCircle,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  Search,
  X,
  Lightbulb,
} from "lucide-react";

export interface HubMenuItem {
  href: string;
  label: string;
  sub: string;
  icon: any;
  color: string;
  bg: string;
  badge?: string;
  isExternal?: boolean;
}

export interface HubCategory {
  id: string;
  title: string;
  badge: string;
  description: string;
  isRareConfig?: boolean;
  color: string;
  bg: string;
  items: HubMenuItem[];
}

interface AdminHubGridProps {
  qualiopiEnabled?: boolean;
}

export default function AdminHubGrid({
  qualiopiEnabled = false,
}: AdminHubGridProps) {
  const [activeHoverGroup, setActiveHoverGroup] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const categories: HubCategory[] = [
    {
      id: "vie-scolaire",
      title: "Vie Scolaire & Quotidien",
      badge: "Consultation Quotidienne",
      description: "Gestion des cours, absences, devoirs et discipline de l'école au jour le jour.",
      color: "text-blue-600",
      bg: "bg-blue-50",
      items: [
        {
          href: "/admin/planning",
          label: "Emploi du temps",
          sub: "Calendrier des cours, salles et créneaux",
          icon: Calendar,
          color: "text-blue-600",
          bg: "bg-blue-50",
          badge: "Quotidien",
        },
        {
          href: "/admin/devoirs",
          label: "Devoirs & Cahier de textes",
          sub: "Supervision de tous les devoirs et suivi élèves",
          icon: BookMarked,
          color: "text-indigo-600",
          bg: "bg-indigo-50",
          badge: "Supervision",
        },
        {
          href: "/admin/absences",
          label: "Absences & Retards",
          sub: "Émargements, justificatifs et régularisations",
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-50",
          badge: "Appels",
        },
        {
          href: "/admin/sanctions",
          label: "Sanctions Disciplinaires",
          sub: "Retenues, rapports d'incident et suivi",
          icon: ShieldAlert,
          color: "text-red-600",
          bg: "bg-red-50",
          badge: "Discipline",
        },
        {
          href: "/admin/dispenses",
          label: "Dispenses d'Élèves",
          sub: "Exemptions médicales ou pédagogiques",
          icon: ShieldCheck,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
      ],
    },
    {
      id: "pedagogie",
      title: "Pédagogie & Évaluations",
      badge: "Scolarité & Examens",
      description: "Suivi des promotions, notes, livrets d'apprentissage et compétences.",
      color: "text-violet-600",
      bg: "bg-violet-50",
      items: [
        {
          href: "/admin/classes",
          label: "Classes & Effectifs",
          sub: "Promotions, trombinoscope et listes d'étudiants",
          icon: BookOpen,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          href: "/admin/notes",
          label: "Dernières Notes",
          sub: "Flux en direct des notes saisies par les profs",
          icon: GraduationCap,
          color: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          href: "/admin/report-cards",
          label: "Bulletins Semestriels",
          sub: "Génération, appréciations et clôture",
          icon: FileText,
          color: "text-indigo-600",
          bg: "bg-indigo-50",
        },
        {
          href: "/admin/livret",
          label: "Livrets d'Apprentissage",
          sub: "Exploitation du livret d'alternance et missions",
          icon: ClipboardList,
          color: "text-rose-600",
          bg: "bg-rose-50",
        },
        {
          href: "/admin/recap/competencies",
          label: "Matrice des Compétences",
          sub: "Suivi de l'acquisition des compétences",
          icon: LayoutDashboard,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
        {
          href: "/admin/documents",
          label: "Attestations & Certificats",
          sub: "Génération d'attestations et documents officiels",
          icon: FileCheck,
          color: "text-teal-600",
          bg: "bg-teal-50",
        },
      ],
    },
    {
      id: "communication",
      title: "Communication & Relations",
      badge: "Échanges & Pilotage",
      description: "Canaux de communication, entreprises partenaires, familles et pilotage global.",
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      items: [
        {
          href: "/admin/notifications",
          label: "Notifications & Alertes",
          sub: "Diffusion ciblée, accusés et programmation",
          icon: Bell,
          color: "text-blue-600",
          bg: "bg-blue-50",
          badge: "Accusés",
        },
        {
          href: "/messages",
          label: "Messagerie Instantanée",
          sub: "Messagerie directe profs, étudiants, tuteurs",
          icon: MessageSquare,
          color: "text-sky-600",
          bg: "bg-sky-50",
        },
        {
          href: "/admin/dashboard",
          label: "Tour de Contrôle",
          sub: "KPIs globaux, graphiques et pilotage",
          icon: LayoutDashboard,
          color: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          href: "/admin/relations/families",
          label: "Relations Familles",
          sub: "Annuaire des parents et tuteurs légaux",
          icon: Home,
          color: "text-cyan-600",
          bg: "bg-cyan-50",
        },
        {
          href: "/admin/relations/contracts",
          label: "Alternance & Entreprises",
          sub: "Contrats, conventions et tuteurs industriels",
          icon: HeartHandshake,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          href: "/admin/idees",
          label: "Boîte à Idées & Pannes",
          sub: "Suggestions & pannes notifiées à l'Admin Général",
          icon: Lightbulb,
          color: "text-amber-600",
          bg: "bg-amber-50",
          badge: "Remontées",
        },
      ],
    },
    {
      id: "parametrage-dur",
      title: "Paramétrage & Système (En dur)",
      badge: "Réglages Rares / Structure",
      description: "Configuration fixe, habilitations, quotas horaires, salles et rôles modifiés rarement.",
      isRareConfig: true,
      color: "text-slate-800",
      bg: "bg-slate-200",
      items: [
        {
          href: "/admin/settings",
          label: "Configuration Générale",
          sub: "Nom d'établissement, options globales core",
          icon: Settings,
          color: "text-slate-900",
          bg: "bg-slate-200",
          badge: "Système",
        },
        {
          href: "/admin/users",
          label: "Comptes & Utilisateurs",
          sub: "Création, désactivation et rôles RBAC",
          icon: Users,
          color: "text-slate-900",
          bg: "bg-slate-200",
        },
        {
          href: "/admin/settings/requirements",
          label: "Quotas Horaires",
          sub: "Volumes d'heures obligatoires par classe & matière",
          icon: ClipboardList,
          color: "text-pink-600",
          bg: "bg-pink-50",
        },
        {
          href: "/admin/rooms",
          label: "Salles & Capacités",
          sub: "Gestion des salles de cours et équipements",
          icon: DoorOpen,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          href: "/admin/teachers/subjects",
          label: "Habilitations Enseignants",
          sub: "Matières autorisées par professeur",
          icon: ShieldCheck,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          href: "/admin/teachers/availability",
          label: "Disponibilités Profs",
          sub: "Plages horaires hebdomadaires fixes des profs",
          icon: Clock,
          color: "text-cyan-600",
          bg: "bg-cyan-50",
        },
        {
          href: "/admin/hr",
          label: "Gestion RH & Salaires",
          sub: "Contrats de travail, taux horaires et paie",
          icon: Briefcase,
          color: "text-slate-800",
          bg: "bg-slate-200",
        },
        ...(qualiopiEnabled
          ? [
              {
                href: "/admin/qualiopi",
                label: "Qualiopi & Enquêtes",
                sub: "Indicateurs de satisfaction et réclamations",
                icon: HeartHandshake,
                color: "text-purple-600",
                bg: "bg-purple-50",
                badge: "Qualité",
              },
            ]
          : []),
        {
          href: "/admin/connexion-docs",
          label: "Fiches de Connexion",
          sub: "Export et impression des identifiants",
          icon: Key,
          color: "text-indigo-600",
          bg: "bg-indigo-50",
        },
        {
          href: "/admin/impersonate",
          label: "Impersonnalisation",
          sub: "Prendre l'identité temporaire d'un compte",
          icon: UserCircle,
          color: "text-rose-600",
          bg: "bg-rose-50",
          badge: "Audit",
        },
      ],
    },
  ];

  const handleMouseEnterGroup = (groupId: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setActiveHoverGroup(groupId);
  };

  const handleMouseLeaveGroup = () => {
    const timeout = setTimeout(() => {
      setActiveHoverGroup(null);
    }, 250);
    setHoverTimeout(timeout);
  };

  // Search filter logic
  const filteredCategories = categories
    .map((cat) => {
      if (!searchFilter.trim()) return cat;
      const q = searchFilter.toLowerCase();
      const matchingItems = cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.sub.toLowerCase().includes(q) ||
          (item.badge && item.badge.toLowerCase().includes(q))
      );
      return {
        ...cat,
        items: matchingItems,
      };
    })
    .filter((cat) => !searchFilter.trim() || cat.items.length > 0);

  return (
    <div className="space-y-10">
      {/* Top Interactive Hub Bar with Hover Dropdowns */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/10">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Hub Navigation & Regroupements
              </h2>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Survolez un bouton pour prévisualiser instantanément ses sous-menus
              </p>
            </div>
          </div>

          {/* Quick search inside menus */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer les menus..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Group Launcher Buttons with Hover Popovers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {categories.map((cat) => {
            const isHovered = activeHoverGroup === cat.id;

            return (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={() => handleMouseEnterGroup(cat.id)}
                onMouseLeave={handleMouseLeaveGroup}
              >
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(cat.id);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-full group ${
                    cat.isRareConfig
                      ? "bg-slate-100/90 border-slate-300 hover:bg-slate-200 hover:border-slate-400"
                      : "bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                  } ${isHovered ? "ring-2 ring-blue-500 shadow-lg bg-white border-blue-400" : "shadow-xs"}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        cat.isRareConfig
                          ? "bg-slate-200 text-slate-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {cat.items.length} menus
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform ${
                        isHovered ? "rotate-90 text-blue-600" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-700 transition leading-snug">
                      {cat.title}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {cat.badge}
                    </p>
                  </div>
                </button>

                {/* Floating Popover on Hover detailing all sub-menus */}
                {isHovered && (
                  <div
                    onMouseEnter={() => handleMouseEnterGroup(cat.id)}
                    onMouseLeave={handleMouseLeaveGroup}
                    className="absolute top-full left-0 mt-2 z-50 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                          {cat.title}
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          {cat.description}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ml-2 ${
                          cat.isRareConfig
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-blue-50 text-blue-800 border border-blue-100"
                        }`}
                      >
                        {cat.badge}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                      {cat.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 group/item transition border border-transparent hover:border-slate-200"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`h-9 w-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform shadow-xs`}
                            >
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover/item:text-blue-600 truncate">
                                {item.label}
                              </p>
                              <p className="text-xs text-slate-500 font-medium truncate">
                                {item.sub}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover/item:text-blue-500 group-hover/item:translate-x-0.5 transition-all shrink-0 ml-2" />
                        </Link>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                      <span>Cliquez pour ouvrir</span>
                      <span className="text-blue-600 font-bold">Accès direct →</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Categories Display with High Legibility */}
      <div className="space-y-12">
        {filteredCategories.map((category) => {
          const isRare = category.isRareConfig;

          return (
            <section
              key={category.id}
              id={category.id}
              className={`space-y-5 rounded-3xl p-6 sm:p-8 transition-all ${
                isRare
                  ? "bg-slate-100/80 border-2 border-dashed border-slate-300 shadow-sm"
                  : "bg-white border border-slate-200 shadow-sm"
              }`}
            >
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200/80">
                <div className="flex items-center gap-4">
                  <span
                    className={`h-12 w-12 rounded-2xl ${category.bg} ${category.color} flex items-center justify-center shadow-sm shrink-0`}
                  >
                    {isRare ? <Settings className="h-6 w-6" /> : <Layers className="h-6 w-6" />}
                  </span>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {category.title}
                      </h2>
                      <span
                        className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isRare
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {category.badge}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                      {category.description}
                    </p>
                  </div>
                </div>

                {isRare && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-bold shrink-0 self-start sm:self-auto">
                    <Info className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>Paramétrages structurels modifiés rarement</span>
                  </div>
                )}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {category.items.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`group relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-200 ${
                      isRare
                        ? "bg-white border-slate-200 hover:border-slate-400 hover:shadow-md"
                        : "bg-slate-50/70 border-slate-200 hover:bg-white hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`h-12 w-12 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-2 shadow-xs`}
                      >
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm sm:text-base font-black text-slate-900 truncate group-hover:text-blue-600 transition">
                            {action.label}
                          </p>
                          {action.badge && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 shrink-0">
                              {action.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-600 leading-snug mt-1 line-clamp-2">
                          {action.sub}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
