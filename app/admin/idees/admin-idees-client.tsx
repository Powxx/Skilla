"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Lightbulb,
  Sparkles,
  Plus,
  Search,
  Filter,
  ThumbsUp,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Crown,
  Trash2,
  ArrowRight,
  TrendingUp,
  User,
  Calendar,
  Send,
  Loader2,
  Check,
  ChevronDown,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import {
  createAdminIdea,
  toggleAdminIdeaVote,
  updateAdminIdeaStatus,
  deleteAdminIdea,
} from "@/app/actions/ideas";
import { AdminIdeaCategory, AdminIdeaStatus } from "@prisma/client";

export interface AdminIdeaItem {
  id: string;
  title: string;
  description: string;
  category: AdminIdeaCategory;
  status: AdminIdeaStatus;
  adminResponse: string | null;
  respondedAt: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  updatedAt: string;
  votesCount: number;
  hasVoted: boolean;
  isOwnIdea: boolean;
}

interface AdminIdeesClientProps {
  ideas: AdminIdeaItem[];
  currentUserId: string;
  isGeneralAdmin: boolean;
}

const CATEGORY_CONFIG: Record<
  AdminIdeaCategory,
  { label: string; color: string; bg: string; border: string; icon?: any }
> = {
  BREAKDOWN: {
    label: "Panne & Incident matériel / technique",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: Wrench,
  },
  PEDAGOGY: {
    label: "Pédagogie & Évaluations",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  SCHOOL_LIFE: {
    label: "Vie Scolaire & Quotidien",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  COMMUNICATION: {
    label: "Communication & Relations",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
  },
  TOOLS_ERGONOMICS: {
    label: "Outils & Ergonomie",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  ADMIN_PROCESS: {
    label: "Processus Administratifs & RH",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  OTHER: {
    label: "Autre suggestion",
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
};

const STATUS_CONFIG: Record<
  AdminIdeaStatus,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  SUBMITTED: {
    label: "Nouvelle / À étudier",
    color: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: "En cours d'étude",
    color: "text-blue-800",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Retenue / Planifiée",
    color: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  IMPLEMENTED: {
    label: "Réalisée / Déployée",
    color: "text-purple-800",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Sparkles,
  },
  REJECTED: {
    label: "Non retenue",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    icon: X,
  },
};

export default function AdminIdeesClient({
  ideas: initialIdeas,
  currentUserId,
  isGeneralAdmin,
}: AdminIdeesClientProps) {
  const [ideas, setIdeas] = useState<AdminIdeaItem[]>(initialIdeas);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"VOTES" | "RECENT">("VOTES");

  // Modal: New Idea
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<AdminIdeaCategory>("TOOLS_ERGONOMICS");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal: General Admin Review
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedIdeaForReview, setSelectedIdeaForReview] = useState<AdminIdeaItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<AdminIdeaStatus>("UNDER_REVIEW");
  const [reviewResponse, setReviewResponse] = useState("");
  const [isSavingReview, setIsSavingReview] = useState(false);

  // Loading states
  const [votingId, setVotingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // KPIs
  const totalCount = ideas.length;
  const breakdownCount = ideas.filter((i) => i.category === "BREAKDOWN").length;
  const ideasOnlyCount = ideas.filter((i) => i.category !== "BREAKDOWN").length;
  const pendingCount = ideas.filter((i) => i.status === "SUBMITTED").length;
  const underReviewCount = ideas.filter((i) => i.status === "UNDER_REVIEW").length;
  const acceptedOrImplementedCount = ideas.filter(
    (i) => i.status === "ACCEPTED" || i.status === "IMPLEMENTED"
  ).length;

  const openCreateModal = (cat: AdminIdeaCategory = "TOOLS_ERGONOMICS") => {
    setNewCategory(cat);
    setNewTitle("");
    setNewDescription("");
    setFormError(null);
    setCreateModalOpen(true);
  };

  // Filtered and sorted list
  const filteredIdeas = useMemo(() => {
    return ideas
      .filter((idea) => {
        if (selectedCategory !== "ALL" && idea.category !== selectedCategory) return false;
        if (selectedStatus !== "ALL" && idea.status !== selectedStatus) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = idea.title.toLowerCase().includes(q);
          const matchesDesc = idea.description.toLowerCase().includes(q);
          const matchesAuthor = idea.authorName.toLowerCase().includes(q);
          const matchesResp = (idea.adminResponse || "").toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesAuthor && !matchesResp) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "VOTES") {
          if (b.votesCount !== a.votesCount) {
            return b.votesCount - a.votesCount;
          }
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [ideas, selectedCategory, selectedStatus, searchQuery, sortBy]);

  // Handlers
  const handleVote = async (ideaId: string) => {
    setVotingId(ideaId);
    try {
      const res = await toggleAdminIdeaVote(ideaId);
      setIdeas((prev) =>
        prev.map((i) => {
          if (i.id === ideaId) {
            return {
              ...i,
              hasVoted: res.hasVoted,
              votesCount: res.hasVoted ? i.votesCount + 1 : Math.max(0, i.votesCount - 1),
            };
          }
          return i;
        })
      );
    } catch (err) {
      console.error("Error voting:", err);
    } finally {
      setVotingId(null);
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError("Veuillez saisir un titre pour votre idée.");
      return;
    }
    if (!newDescription.trim()) {
      setFormError("Veuillez détailler votre idée.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await createAdminIdea({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
      });

      const newFormatted: AdminIdeaItem = {
        id: created.id,
        title: created.title,
        description: created.description,
        category: created.category,
        status: created.status,
        adminResponse: null,
        respondedAt: null,
        authorId: currentUserId,
        authorName: "Vous",
        authorRole: "ADMIN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        votesCount: 0,
        hasVoted: false,
        isOwnIdea: true,
      };

      setIdeas((prev) => [newFormatted, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la création de l'idée.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (idea: AdminIdeaItem) => {
    setSelectedIdeaForReview(idea);
    setReviewStatus(idea.status);
    setReviewResponse(idea.adminResponse || "");
    setReviewModalOpen(true);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdeaForReview) return;

    setIsSavingReview(true);
    try {
      await updateAdminIdeaStatus({
        ideaId: selectedIdeaForReview.id,
        status: reviewStatus,
        adminResponse: reviewResponse,
      });

      setIdeas((prev) =>
        prev.map((i) => {
          if (i.id === selectedIdeaForReview.id) {
            return {
              ...i,
              status: reviewStatus,
              adminResponse: reviewResponse.trim() || null,
              respondedAt: new Date().toISOString(),
            };
          }
          return i;
        })
      );

      setReviewModalOpen(false);
    } catch (err) {
      console.error("Error saving review:", err);
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleDelete = async (ideaId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette idée ?")) return;
    setDeletingId(ideaId);
    try {
      await deleteAdminIdea(ideaId);
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    } catch (err) {
      console.error("Error deleting idea:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-9 w-9 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Lightbulb className="h-5 w-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-amber-700">
              Boîte à Idées & Signalement de Pannes
            </span>
            {isGeneralAdmin && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-xs ml-1">
                <Crown className="w-3.5 h-3.5 text-amber-700" />
                Administrateur Général
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Remontées & Pannes Matérielles
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Partagez vos propositions d'évolutions ou signalez une panne technique : chaque remontée notifie directement l'Administrateur Général.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin"
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            ← Retour au Hub
          </Link>
          <button
            type="button"
            onClick={() => openCreateModal("BREAKDOWN")}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition shadow-md active:scale-95"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            Signaler une panne
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("TOOLS_ERGONOMICS")}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Proposer une idée
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{ideasOnlyCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              Idées soumises
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xl font-black text-rose-700">{breakdownCount}</p>
              {breakdownCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800">
                  Alerte
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-rose-500 uppercase tracking-tight">
              Pannes / Incidents
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-50/80 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-700">{pendingCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              À étudier
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-blue-600">{underReviewCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              En cours
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5 col-span-2 lg:col-span-1">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-600">
              {acceptedOrImplementedCount}
            </p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              Retenues / Déployées
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une idée, un sujet ou une réponse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdowns & Sort */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category */}
          <div className="relative flex items-center">
            <Filter className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition appearance-none"
            >
              <option value="ALL">Toutes les catégories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="relative flex items-center">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition appearance-none"
            >
              <option value="ALL">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSortBy("VOTES")}
              className={`px-3 py-1.5 rounded-lg transition ${
                sortBy === "VOTES"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Plus populaires 🔥
            </button>
            <button
              onClick={() => setSortBy("RECENT")}
              className={`px-3 py-1.5 rounded-lg transition ${
                sortBy === "RECENT"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Plus récentes
            </button>
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {totalCount === 0
              ? "Aucune idée proposée pour le moment"
              : "Aucune idée ne correspond à vos filtres"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {totalCount === 0
              ? "Soyez le premier à proposer une amélioration pour l'établissement !"
              : "Essayez de modifier votre recherche ou de réinitialiser les filtres."}
          </p>
          {totalCount === 0 && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              + Proposer la première idée
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredIdeas.map((idea) => {
            const cat = CATEGORY_CONFIG[idea.category] || CATEGORY_CONFIG.OTHER;
            const st = STATUS_CONFIG[idea.status] || STATUS_CONFIG.SUBMITTED;
            const StatusIcon = st.icon;
            const isVoting = votingId === idea.id;
            const isDeleting = deletingId === idea.id;
            const canDelete = isGeneralAdmin || idea.isOwnIdea;

            const isBreakdown = idea.category === "BREAKDOWN";
            const CatIcon = cat.icon;

            return (
              <div
                key={idea.id}
                className={`rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between ${
                  isBreakdown
                    ? "bg-rose-50/15 border-rose-200 hover:border-rose-400 hover:shadow-rose-100/50"
                    : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <span
                      className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${cat.bg} ${cat.color} ${cat.border}`}
                    >
                      {CatIcon && <CatIcon className="w-3.5 h-3.5" />}
                      {cat.label}
                    </span>

                    <span
                      className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.color} ${st.border}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {st.label}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug mb-2 flex items-start gap-2">
                    {isBreakdown && (
                      <span className="text-rose-600 font-bold shrink-0">🚨</span>
                    )}
                    <span>{idea.title}</span>
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto custom-scrollbar p-3 rounded-xl bg-slate-50 border border-slate-100">
                    {idea.description}
                  </p>

                  {/* General Admin Official Response Box */}
                  {idea.adminResponse && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-900 uppercase tracking-wider">
                          <Crown className="w-3.5 h-3.5 text-amber-700" />
                          Décision & Réponse de l'Admin Général
                        </span>
                        {idea.respondedAt && (
                          <span className="text-[10px] text-amber-700 font-semibold">
                            {new Date(idea.respondedAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {idea.adminResponse}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer bar */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {/* Author info */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="font-bold text-slate-800 truncate leading-tight">
                        {idea.authorName} {idea.isOwnIdea && "(Vous)"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(idea.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons: Upvote & Admin Review */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Vote button */}
                    <button
                      type="button"
                      disabled={isVoting}
                      onClick={() => handleVote(idea.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition ${
                        idea.hasVoted
                          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                          : "bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700"
                      }`}
                      title={idea.hasVoted ? "Retirer mon soutien" : "Soutenir cette idée"}
                    >
                      {isVoting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ThumbsUp className="w-3.5 h-3.5" />
                      )}
                      <span>{idea.votesCount}</span>
                    </button>

                    {/* General Admin Action */}
                    {isGeneralAdmin && (
                      <button
                        type="button"
                        onClick={() => openReviewModal(idea)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition shadow-xs"
                        title="Arbitrer cette idée en tant qu'administrateur général"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-700" />
                        <span>Arbitrer</span>
                      </button>
                    )}

                    {/* Delete button */}
                    {canDelete && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(idea.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer cette idée"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Idea */}
      {createModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg min-w-[320px] shadow-2xl relative flex flex-col border border-slate-100">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-5 pr-8">
                {newCategory === "BREAKDOWN" ? (
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1.5 w-fit">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Signalement d'Incident / Panne
                  </span>
                ) : (
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    Nouvelle Proposition
                  </span>
                )}
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {newCategory === "BREAKDOWN"
                    ? "Signaler une panne ou un incident matériel"
                    : "Déposer une idée dans la boîte à idées"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {newCategory === "BREAKDOWN"
                    ? "Une alerte prioritaire sera directement envoyée à l'Administrateur Général"
                    : "Votre proposition sera transmise directement à l'Administrateur Général pour étude"}
                </p>
              </div>

              {newCategory === "BREAKDOWN" && (
                <div className="mb-4 p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Notification immédiate :</strong> Cette panne remontera en direct avec un niveau d'alerte prioritaire sur le centre de notifications et le compte de l'<strong>Administrateur Général</strong>.
                  </p>
                </div>
              )}

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateIdea} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Catégorie de la remontée
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as AdminIdeaCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer transition"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    {newCategory === "BREAKDOWN"
                      ? "Objet / Équipement ou salle concernée"
                      : "Titre de la proposition"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      newCategory === "BREAKDOWN"
                        ? "Ex: Vidéoprojecteur HS en salle 204, Panne Wi-Fi Bâtiment B..."
                        : "Ex: Automatiser les relances d'assiduité par SMS..."
                    }
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    {newCategory === "BREAKDOWN"
                      ? "Description de la panne, symptômes & urgence"
                      : "Description & Bénéfices attendus"}
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={
                      newCategory === "BREAKDOWN"
                        ? "Précisez l'incident, depuis quand il survient, la salle/matériel impacté et le degré de blocage pour les cours..."
                        : "Expliquez en détail l'idée, le problème qu'elle résout et comment la mettre en place..."
                    }
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition custom-scrollbar"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-xs font-black transition shadow-sm ${
                      newCategory === "BREAKDOWN"
                        ? "bg-rose-600 hover:bg-rose-700 active:scale-95"
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : newCategory === "BREAKDOWN" ? (
                      <AlertTriangle className="w-4 h-4 text-white" />
                    ) : (
                      <Send className="w-4 h-4 text-amber-400" />
                    )}
                    <span>
                      {newCategory === "BREAKDOWN"
                        ? "Signaler la panne à l'Admin Général"
                        : "Soumettre l'idée"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: General Admin Review */}
      {reviewModalOpen && selectedIdeaForReview &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto custom-scrollbar flex min-h-screen items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg min-w-[320px] shadow-2xl relative flex flex-col border border-slate-100">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 pr-8">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 w-fit">
                  <Crown className="w-3.5 h-3.5 text-amber-700" />
                  {selectedIdeaForReview.category === "BREAKDOWN"
                    ? "Prise en charge Panne — Admin Général"
                    : "Arbitrage Boîte à Idées — Admin Général"}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {selectedIdeaForReview.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Signalé par <span className="font-bold text-slate-700">{selectedIdeaForReview.authorName}</span>
                </p>
              </div>

              {/* Suggestion reminder */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl mb-4 text-xs text-slate-700 max-h-32 overflow-y-auto custom-scrollbar">
                {selectedIdeaForReview.description}
              </div>

              <form onSubmit={handleSaveReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    {selectedIdeaForReview.category === "BREAKDOWN"
                      ? "Statut d'intervention / Traitement"
                      : "Statut de la décision"}
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as AdminIdeaStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer transition"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    {selectedIdeaForReview.category === "BREAKDOWN"
                      ? "Commentaire de prise en charge / Résolution"
                      : "Réponse officielle / Commentaire de l'Administrateur Général"}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={
                      selectedIdeaForReview.category === "BREAKDOWN"
                        ? "Indiquez l'état d'intervention technique, réparateur mandaté ou confirmation de résolution..."
                        : "Indiquez votre arbitrage, calendrier envisagé ou motif de non-retenue..."
                    }
                    value={reviewResponse}
                    onChange={(e) => setReviewResponse(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition custom-scrollbar"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingReview}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition shadow-sm"
                  >
                    {isSavingReview ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Enregistrer la décision</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
