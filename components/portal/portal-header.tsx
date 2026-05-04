"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

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
       case "planning": currentCrumb = "Planning"; break;
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
        <div className="bg-orange-600 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 animate-pulse">
               <span className="text-[10px]">⚠️</span>
            </div>
            <p className="tracking-wide">
              MODE IMPERSONNALISATION : Vous contrôlez actuellement le compte de <span className="underline decoration-2 underline-offset-4">{(session?.user as any)?.name}</span>
            </p>
          </div>
          <button 
            onClick={handleStopImpersonation} 
            className="px-4 py-1.5 bg-white text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 transition shadow-sm"
          >
            Quitter le contrôle
          </button>
        </div>
      )}
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs transition group-hover:scale-105">S</div>
              <span className="font-bold text-slate-900 tracking-tight hidden sm:block">Skilla</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-400">
              <Link href={spaceHref()} className="text-slate-900 hover:text-slate-900">{spaceLabel()}</Link>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-500">{currentCrumb}</span>
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
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">{session?.user?.name}</p>
                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">{session?.user?.role}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="h-9 px-4 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition border border-slate-200"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation based on role */}
      <div className="bg-slate-50/50 border-t border-slate-100 overflow-x-auto no-scrollbar">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex gap-1 py-1">
          {variant === "admin" && (
            <>
              <NavLink href="/admin" active={pathname === "/admin"}>Accueil</NavLink>
              <NavLink href="/admin/users" active={pathname.startsWith("/admin/users")}>Utilisateurs</NavLink>
              <NavLink href="/admin/planning" active={pathname.startsWith("/admin/planning")}>Planning</NavLink>
              <NavLink href="/admin/report-cards" active={pathname.startsWith("/admin/report-cards")}>Bulletins</NavLink>
              <NavLink href="/admin/recap" active={pathname.startsWith("/admin/recap")}>Récapitulatif</NavLink>
              <NavLink href="/admin/settings" active={pathname === "/admin/settings"}>Config</NavLink>
              <NavLink href="/admin/settings/competencies" active={pathname.startsWith("/admin/settings/competencies")}>Compétences</NavLink>
            </>
          )}
          {variant === "prof" && (
            <>
              <NavLink href="/prof" active={pathname === "/prof"}>Tableau de bord</NavLink>
              <NavLink href="/prof/planning" active={pathname.startsWith("/prof/planning")}>Planning</NavLink>
              <NavLink href="/prof/appel" active={pathname.startsWith("/prof/appel")}>Appel</NavLink>
              <NavLink href="/prof/notes" active={pathname.startsWith("/prof/notes")}>Notes</NavLink>
              <NavLink href="/prof/livret" active={pathname.startsWith("/prof/livret")}>Livret</NavLink>
            </>
          )}
          {variant === "student" && (
            <>
              <NavLink href="/student/dashboard" active={pathname.startsWith("/student/dashboard")}>Synthèse</NavLink>
              <NavLink href="/student/planning" active={pathname.startsWith("/student/planning")}>Planning</NavLink>
              <NavLink href="/student/grades" active={pathname.startsWith("/student/grades")}>Notes</NavLink>
              <NavLink href="/student/livret" active={pathname.startsWith("/student/livret")}>Livret</NavLink>
              <NavLink href="/student/absences" active={pathname.startsWith("/student/absences")}>Absences</NavLink>
            </>
          )}
          {(variant === "parent" || variant === "employer") && (
            <>
              <NavLink href={`/${variant}/dashboard?studentId=${resolvedChildId}`} active={pathname.includes("/dashboard")}>Synthèse</NavLink>
              <NavLink href={`/${variant}/planning?studentId=${resolvedChildId}`} active={pathname.includes("/planning")}>Planning</NavLink>
              <NavLink href={`/${variant}/grades?studentId=${resolvedChildId}`} active={pathname.includes("/grades")}>Notes</NavLink>
              <NavLink href={`/${variant}/livret?studentId=${resolvedChildId}`} active={pathname.includes("/livret")}>Livret</NavLink>
              <NavLink href={`/${variant}/absences?studentId=${resolvedChildId}`} active={pathname.includes("/absences")}>Absences</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${active ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
    >
      {children}
    </Link>
  );
}
