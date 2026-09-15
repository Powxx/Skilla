"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getAvailableTeachersForLinking, getAdminLinkedTeacher, linkAdminToTeacher } from "@/app/actions/teacher-linking";
import { UserCheck, Link as LinkIcon, X, Check, ArrowRight } from "lucide-react";

export default function AdminTeacherLinkButton({ variant }: { variant?: string }) {
  const { data: session } = useSession();
  const [linkedTeacher, setLinkedTeacher] = useState<any | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [current, list] = await Promise.all([
        getAdminLinkedTeacher(),
        getAvailableTeachersForLinking()
      ]);
      setLinkedTeacher(current);
      if (current) {
        setSelectedTeacherId(current.id);
      }
      setTeachers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (targetId: string | null) => {
    setLoading(true);
    try {
      const res = await linkAdminToTeacher(targetId);
      if (res.ok) {
        await loadData();
        setIsOpen(false);
      } else {
        alert(res.error || "Une erreur est survenue");
      }
    } catch (e: any) {
      alert(e.message || "Erreur lors de la liaison");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      {linkedTeacher ? (
        <div className="flex items-center gap-1.5">
          <Link
            href="/prof"
            className="h-9 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-[11px] font-black flex items-center gap-2 transition shadow-sm"
            title={`Espace professeur de ${linkedTeacher.firstName} ${linkedTeacher.lastName}`}
          >
            <span className="text-xs">👨‍🏫</span>
            <span className="truncate max-w-[120px] sm:max-w-[160px]">
              Prof. {linkedTeacher.lastName}
            </span>
            <ArrowRight className="h-3 w-3 opacity-60" />
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition"
            title="Changer de compte professeur lié"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="h-9 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black flex items-center gap-1.5 transition uppercase tracking-wider"
        >
          <span>👨‍🏫</span>
          <span className="hidden sm:inline">Lier un Prof</span>
        </button>
      )}

      {/* Modal de liaison */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                👨‍🏫
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">Compte Professeur Lié</h3>
                <p className="text-[11px] text-slate-500 font-bold">Associez un professeur à votre compte administrateur</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
              Les notifications seront partagées et vous disposerez d'un accès rapide direct à cet espace professeur.
            </p>

            <div className="space-y-3 mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professeur cible</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- Aucun (Délier) --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.email || "Sans email"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              {linkedTeacher && (
                <button
                  onClick={() => handleSave(null)}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-black hover:bg-red-100 transition disabled:opacity-50"
                >
                  Délier
                </button>
              )}
              <button
                onClick={() => handleSave(selectedTeacherId || null)}
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
