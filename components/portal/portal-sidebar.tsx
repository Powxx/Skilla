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
  X
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
};

export default function PortalSidebar({ variant, resolvedChildId }: Props) {
  const pathname = usePathname() ?? "";
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [];

  switch (variant) {
    case "admin":
      navItems.push(
        { href: "/admin", label: "Accueil", icon: LayoutDashboard },
        { href: "/admin/users", label: "Utilisateurs", icon: Users },
        { href: "/admin/planning", label: "Planning", icon: Calendar },
        { href: "/admin/report-cards", label: "Bulletins", icon: FileText },
        { href: "/admin/livret", label: "Livret", icon: BookOpen },
        { href: "/admin/recap", label: "Récapitulatif", icon: BarChart },
        { href: "/admin/settings", label: "Config", icon: Settings }
      );
      break;
    case "prof":
      navItems.push(
        { href: "/prof", label: "Dashboard", icon: LayoutDashboard },
        { href: "/prof/planning", label: "Planning", icon: Calendar },
        { href: "/prof/appel", label: "Appel", icon: Clock },
        { href: "/prof/notes", label: "Notes", icon: GraduationCap },
        { href: "/prof/livret", label: "Livret", icon: BookOpen }
      );
      break;
    case "student":
      navItems.push(
        { href: "/student/dashboard", label: "Synthèse", icon: LayoutDashboard },
        { href: "/student/planning", label: "Planning", icon: Calendar },
        { href: "/student/grades", label: "Notes", icon: GraduationCap },
        { href: "/student/livret", label: "Livret", icon: BookOpen },
        { href: "/student/absences", label: "Absences", icon: Clock }
      );
      break;
    case "parent":
    case "employer":
      const prefix = `/${variant}`;
      const suffix = resolvedChildId ? `?studentId=${resolvedChildId}` : "";
      navItems.push(
        { href: `${prefix}/dashboard${suffix}`, label: "Synthèse", icon: LayoutDashboard },
        { href: `${prefix}/planning${suffix}`, label: "Planning", icon: Calendar },
        { href: `${prefix}/grades${suffix}`, label: "Notes", icon: GraduationCap },
        { href: `${prefix}/livret${suffix}`, label: "Livret", icon: BookOpen },
        { href: `${prefix}/absences${suffix}`, label: "Absences", icon: Clock }
      );
      break;
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[100] p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-[90] w-64 bg-slate-900 text-white flex flex-col h-screen transform transition-transform duration-300 lg:translate-x-0 lg:static ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/10 mt-12 lg:mt-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs transition group-hover:scale-110 shadow-lg shadow-blue-500/20">S</div>
            <span className="font-bold text-lg tracking-tight">Skilla</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== `/${variant}` && pathname.startsWith(item.href.split('?')[0]));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3 px-4 py-2">
             <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center border border-white/10">
                <UserCircle className="h-5 w-5 text-slate-400" />
             </div>
             <div className="overflow-hidden">
                <p className="text-xs font-bold truncate opacity-90 uppercase tracking-wider">{variant}</p>
                <p className="text-[10px] text-slate-500 truncate">V. 1.0.0</p>
             </div>
          </div>
        </div>
      </aside>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[80] lg:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}
