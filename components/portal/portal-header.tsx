"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

export type PortalParentChild = { id: string; label: string };

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function subLinkClass(active: boolean) {
  return active
    ? "text-sm font-semibold text-slate-900"
    : "text-sm font-medium text-slate-600 hover:text-slate-900";
}

type Props = {
  variant: "prof" | "student" | "parent";
  parentChildren?: PortalParentChild[];
};

export default function PortalHeader({ variant, parentChildren = [] }: Props) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();

  const qStudent = searchParams.get("studentId");
  const resolvedChildId =
    variant === "parent"
      ? parentChildren.some((s) => s.id === qStudent)
        ? qStudent!
        : parentChildren[0]?.id ?? ""
      : "";

  function parentHref(route: string): string {
    if (variant !== "parent") return route;
    if (!resolvedChildId) return "/parent";
    const joiner = route.includes("?") ? "&" : "?";
    return `${route}${joiner}studentId=${resolvedChildId}`;
  }

  function spaceHref(): string {
    if (variant === "prof") return "/prof";
    if (variant === "student") return "/student";
    return "/parent";
  }

  function spaceLabel(): string {
    if (variant === "prof") return "Espace professeur";
    if (variant === "student") return "Espace élève";
    return "Espace famille";
  }

  let currentCrumb = "";
  if (variant === "prof") {
    if (pathname === "/prof") currentCrumb = "Accueil";
    else if (pathname === "/prof/notes") currentCrumb = "Notes";
    else if (pathname === "/prof/appel") currentCrumb = "Appel";
  } else if (variant === "student") {
    if (pathname === "/student") currentCrumb = "Accueil";
    else if (pathname === "/student/dashboard") currentCrumb = "Tableau de bord";
    else if (pathname === "/student/grades") currentCrumb = "Mes notes";
    else if (pathname === "/student/absences") currentCrumb = "Absences & retards";
  } else {
    if (pathname === "/parent") currentCrumb = "Accueil";
    else if (pathname === "/parent/dashboard") currentCrumb = "Tableau de bord";
    else if (pathname === "/parent/grades") currentCrumb = "Notes de l’élève";
    else if (pathname === "/parent/absences") currentCrumb = "Absences & retards";
  }

  const onHub = pathname === "/prof" || pathname === "/student" || pathname === "/parent";

  const onChildChange = (nextId: string) => {
    const path = pathname || "/parent";
    const sp = new URLSearchParams(searchParams.toString());
    if (nextId) sp.set("studentId", nextId);
    else sp.delete("studentId");
    const q = sp.toString();
    router.push(q ? `${path}?${q}` : path);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 shadow-sm shadow-slate-900/[0.03] backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-800">
            Site
          </Link>
          <span className="text-slate-300" aria-hidden>
            /
          </span>
          <Link href={spaceHref()} className="font-medium hover:text-slate-800">
            {spaceLabel()}
          </Link>
          {!onHub && currentCrumb ? (
            <>
              <span className="text-slate-300" aria-hidden>
                /
              </span>
              <span className="font-medium text-slate-900">{currentCrumb}</span>
            </>
          ) : null}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {variant === "parent" && parentChildren.length > 0 ? (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="hidden sm:inline">Enfant</span>
              <select
                className="max-w-[220px] truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none ring-slate-400/20 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
                value={resolvedChildId}
                onChange={(e) => onChildChange(e.target.value)}
              >
                {parentChildren.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={() =>
              void signOut({
                callbackUrl: "/",
              })
            }
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/90">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
          {variant === "prof" ? (
            <>
              <Link href="/prof" className={cx(subLinkClass(pathname === "/prof"))}>
                Accueil espace
              </Link>
              <Link href="/prof/notes" className={cx(subLinkClass(pathname === "/prof/notes"))}>
                Notes
              </Link>
              <Link href="/prof/appel" className={cx(subLinkClass(pathname === "/prof/appel"))}>
                Appel
              </Link>
            </>
          ) : null}

          {variant === "student" ? (
            <>
              <Link href="/student" className={cx(subLinkClass(pathname === "/student"))}>
                Accueil espace
              </Link>
              <Link
                href="/student/dashboard"
                className={cx(subLinkClass(pathname === "/student/dashboard"))}
              >
                Tableau de bord
              </Link>
              <Link href="/student/grades" className={cx(subLinkClass(pathname === "/student/grades"))}>
                Mes notes
              </Link>
              <Link
                href="/student/absences"
                className={cx(subLinkClass(pathname === "/student/absences"))}
              >
                Absences
              </Link>
            </>
          ) : null}

          {variant === "parent" ? (
            <>
              <Link href="/parent" className={cx(subLinkClass(pathname === "/parent"))}>
                Accueil espace
              </Link>
              <Link
                href={resolvedChildId ? parentHref("/parent/dashboard") : "/parent"}
                className={cx(subLinkClass(pathname === "/parent/dashboard"))}
              >
                Tableau de bord
              </Link>
              <Link
                href={resolvedChildId ? parentHref("/parent/grades") : "/parent"}
                className={cx(subLinkClass(pathname === "/parent/grades"))}
              >
                Notes
              </Link>
              <Link
                href={resolvedChildId ? parentHref("/parent/absences") : "/parent"}
                className={cx(subLinkClass(pathname === "/parent/absences"))}
              >
                Absences
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
