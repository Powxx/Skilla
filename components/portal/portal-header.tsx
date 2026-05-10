"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "@/components/notifications/notification-bell";

export type PortalParentChild = { id: string; label: string };

type Props = {
  variant: "prof" | "student" | "parent" | "admin" | "employer";
  parentChildren?: PortalParentChild[];
};

export default function PortalHeader({ variant, parentChildren = [] }: Props) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();

  const isImpersonated = (session as any)?.impersonated === true;

  const handleStopImpersonation = async () => {
    await update({ stopImpersonation: true });
    window.location.href = "/admin";
  };

  const qStudent = searchParams.get("studentId");
  const resolvedChildId =
    variant === "parent" || variant === "employer"
      ? parentChildren.some((s) => s.id === qStudent)
        ? qStudent!
        : parentChildren[0]?.id ?? ""
      : "";

  function spaceHref(): string {
    switch (variant) {
      case "admin": return "/admin";
      case "prof": return "/prof";
      case "student": return "/student";
      case "employer": return "/employer";
      default: return "/parent";
    }
  }

  function spaceLabel(): string {
    switch (variant) {
      case "admin": return "Administration";
      case "prof": return "Espace Professeur";
      case "student": return "Espace Élève";
      case "employer": return "Espace Tuteur";
      default: return "Espace Famille";
    }
  }

  let currentCrumb = "";
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length > 1) {
     const sub = pathParts[1];
     switch (sub) {
       case "notes": case "grades": currentCrumb = "Notes"; break;
       case "appel": case "absences": currentCrumb = "Absences"; break;
       case "planning": currentCrumb = "Emploi du temps"; break;
       case "dashboard": currentCrumb = "Tableau de bord"; break;
       case "users": currentCrumb = "Utilisateurs"; break;
       case "settings": currentCrumb = "Configuration"; break;
       case "hr": currentCrumb = "Ressources Humaines"; break;
       case "recap": currentCrumb = "Récapitulatif"; break;
       default: currentCrumb = sub.charAt(0).toUpperCase() + sub.slice(1);
     }
  } else {
    currentCrumb = "Accueil";
  }

  const onChildChange = (nextId: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextId) sp.set("studentId", nextId);
    else sp.delete("studentId");
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
      {isImpersonated && (
        <div className="bg-orange-600 text-white text-[10px] font-bold px-4 py-2 flex items-center justify-between">
          <p className="tracking-wide">
            MODE IMPERSONNALISATION : Contrôle de <span className="underline decoration-2 underline-offset-4">{(session?.user as any)?.name}</span>
          </p>
          <button 
            onClick={handleStopImpersonation} 
            className="px-3 py-1 bg-white text-orange-600 rounded-lg font-black uppercase tracking-widest hover:bg-orange-50 transition shadow-sm"
          >
            Quitter
          </button>
        </div>
      )}
      
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Breadcrumbs / Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <Link href="/" className="lg:hidden h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs">S</Link>
            
            <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="text-slate-900">{spaceLabel()}</span>
              <span className="text-slate-300">/</span>
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{currentCrumb}</span>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {(variant === "parent" || variant === "employer") && parentChildren.length > 0 && (
              <select
                className="text-xs font-bold bg-slate-50 border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                value={resolvedChildId}
                onChange={(e) => onChildChange(e.target.value)}
              >
                {parentChildren.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <NotificationBell />
              <div className="text-right hidden sm:block leading-tight">
                <p className="text-xs font-bold text-slate-900">{session?.user?.name}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{session?.user?.role}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="h-8 px-3 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold hover:bg-slate-100 transition border border-slate-200 uppercase tracking-widest"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return null; // No longer used in header
}
