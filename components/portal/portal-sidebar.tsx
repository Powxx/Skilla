"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Calendar, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  Users, 
  Settings, 
  FileText, 
  BarChart, 
  UserCircle,
  Menu,
  X,
  Key,
  Gamepad2,
  MessageSquare,
  ShieldAlert
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  active?: boolean;
};

type Props = {
  variant: "prof" | "student" | "parent" | "admin" | "employer";
  resolvedChildId?: string;
  schoolName?: string;
  arcadeEnabled?: boolean;
  qualiopiEnabled?: boolean;
};

export default function PortalSidebar({ variant, resolvedChildId, schoolName = "Skilla", arcadeEnabled = true, qualiopiEnabled = true }: Props) {
  const pathname = usePathname() ?? "";
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [];

  switch (variant) {
    case "admin":
      navItems.push(
        { href: "/admin/dashboard", label: "Tour de contrôle", icon: LayoutDashboard },
        { href: "/admin", label: "Hub Admin", icon: BarChart },
        { href: "/admin/users", label: "Utilisateurs", icon: Users },
        { href: "/admin/classes", label: "Classes", icon: BookOpen },
        { href: "/admin/planning", label: "Emploi du temps", icon: Calendar },
        { href: "/admin/report-cards", label: "Bulletins", icon: FileText },
        { href: "/admin/livret", label: "Livret", icon: BookOpen },
        { href: "/admin/recap", label: "Récapitulatif", icon: BarChart },
        { href: "/admin/absences", label: "Absences", icon: Clock },
        { href: "/admin/sanctions", label: "Sanctions", icon: ShieldAlert },
        ...(qualiopiEnabled ? [{ href: "/admin/qualiopi", label: "Qualiopi", icon: FileText }] : []),
        { href: "/admin/notifications", label: "Notifications", icon: FileText },
        { href: "/admin/connexion-docs", label: "Connexion Docs", icon: Key },
        { href: "/admin/settings", label: "Config", icon: Settings },
        { href: "/messages", label: "Messages", icon: MessageSquare },
        { href: "/settings/password", label: "Mot de passe", icon: Key }
      );
      break;
    case "prof":
      navItems.push(
        { href: "/prof", label: "Dashboard", icon: LayoutDashboard },
        { href: "/prof/classes", label: "Classes", icon: BookOpen },
        { href: "/prof/planning", label: "Emploi du temps", icon: Calendar },
        { href: "/prof/appel", label: "Appel", icon: Clock },
        { href: "/prof/notes", label: "Notes", icon: GraduationCap },
        { href: "/prof/livret", label: "Livret", icon: BookOpen },
        { href: "/prof/notifications", label: "Notifications", icon: FileText },
        { href: "/prof/sanctions", label: "Sanctions", icon: ShieldAlert },
        { href: "/messages", label: "Messages", icon: MessageSquare },
        { href: "/settings/password", label: "Mot de passe", icon: Key }
      );
      break;
    case "student":
      navItems.push(
        { href: "/student/dashboard", label: "Synthèse", icon: LayoutDashboard },
        { href: "/student/planning", label: "Emploi du temps", icon: Calendar },
        { href: "/student/grades", label: "Notes", icon: GraduationCap }
      );
      if (arcadeEnabled) {
        navItems.push({ href: "/student/games", label: "Arcade", icon: Gamepad2 });
      }
      navItems.push(
        { href: "/student/livret", label: "Livret", icon: BookOpen },
        { href: "/student/absences", label: "Absences", icon: Clock },
        { href: "/student/sanctions", label: "Sanctions", icon: ShieldAlert },
        { href: "/messages", label: "Messages", icon: MessageSquare },
        { href: "/settings/password", label: "Mot de passe", icon: Key }
      );
      break;
    case "parent":
    case "employer":
      const prefix = `/${variant}`;
      const suffix = resolvedChildId ? `?studentId=${resolvedChildId}` : "";
      navItems.push(
        { href: `${prefix}/dashboard${suffix}`, label: "Synthèse", icon: LayoutDashboard },
        { href: `${prefix}/planning${suffix}`, label: "Emploi du temps", icon: Calendar },
        { href: `${prefix}/grades${suffix}`, label: "Notes", icon: GraduationCap },
        { href: `${prefix}/livret${suffix}`, label: "Livret", icon: BookOpen },
        { href: `${prefix}/absences${suffix}`, label: "Absences", icon: Clock },
        { href: `${prefix}/sanctions${suffix}`, label: "Sanctions", icon: ShieldAlert },
        { href: "/messages", label: "Messages", icon: MessageSquare },
        { href: "/settings/password", label: "Mot de passe", icon: Key }
      );
      break;
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-[100] h-14 w-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 border border-white/10"
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-[90] w-72 bg-slate-900 text-white flex flex-col h-screen transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static ${isOpen ? 'translate-x-0' : '-translate-x-full shadow-none'}`}>
        <div className="p-8 border-b border-white/10">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm transition group-hover:rotate-6 shadow-lg shadow-blue-500/30">
              <img src="/SKILLA-Logo.png" alt="SKILLA" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight leading-none">{schoolName}</span>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Plateforme</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== `/${variant}` && pathname.startsWith(item.href.split('?')[0]));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3.5 px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 ring-1 ring-white/10' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/10 shadow-inner">
                <UserCircle className="h-6 w-6 text-slate-400" />
             </div>
             <div className="overflow-hidden">
                <p className="text-[10px] font-black truncate opacity-50 uppercase tracking-[0.2em]">{variant}</p>
                <p className="text-xs font-bold text-white truncate">Skilla App</p>
             </div>
          </div>
        </div>
      </aside>
      {isOpen && <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[80] lg:hidden animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />}
    </>
  );
}
