"use client";

import { Role } from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, deleteUserSafe, updateUser, importUsersAction, updateAdminPermissions } from "./actions";
import { useRef } from "react";
import { useSession } from "next-auth/react";
import { Shield, ShieldAlert, ShieldCheck, Key, FileText, X, MessageSquare } from "lucide-react";
import { MessageButton } from "@/components/chat/MessageButton";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20";

export type ListedUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  lockedRole: boolean;
  hasStudentProfile: boolean;
  hasTeacherProfile: boolean;
  studentClass: { id: string; name: string } | null;
  teacherCourseCount: number;
  canAccessLivrets: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManagePlanning: boolean;
  canManageRH: boolean;
  canImpersonate: boolean;
  isActive: boolean;
  username: string | null;
  phone: string | null;
  company: string | null;
};

type ClassOption = { id: string; name: string };

type Props = {
  users: ListedUserRow[];
  total: number;
  page: number;
  pageSize: number;
  classes: ClassOption[];
  initialQuery: string;
  initialRole: string;
};

const ROLE_OPTIONS: { value: Role | ""; label: string }[] = [
  { value: "", label: "Tous les rôles" },
  { value: Role.SUPER_ADMIN, label: "Super Admin" },
  { value: Role.ADMIN, label: "Administrateur" },
  { value: Role.TEACHER, label: "Professeur" },
  { value: Role.STUDENT, label: "Élève" },
  { value: Role.RESPONSIBLE, label: "Responsable" },
  { value: Role.COMPANY_TUTOR, label: "Employeur" },
];

const ROLE_EDIT_OPTIONS = ROLE_OPTIONS.filter((o) => o.value !== "");

function roleBadgeClasses(role: Role) {
  switch (role) {
    case Role.SUPER_ADMIN:
      return "bg-red-100 text-red-900 ring-red-200";
    case Role.ADMIN:
      return "bg-violet-100 text-violet-900 ring-violet-200";
    case Role.TEACHER:
      return "bg-sky-100 text-sky-900 ring-sky-200";
    case Role.STUDENT:
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    case Role.RESPONSIBLE:
      return "bg-amber-100 text-amber-950 ring-amber-200";
    case Role.COMPANY_TUTOR:
      return "bg-yellow-100 text-yellow-950 ring-yellow-200";
    default:
      return "bg-slate-100 text-slate-800 ring-slate-200";
  }
}

function canDeleteListedUser(u: ListedUserRow): boolean {
  if (u.hasTeacherProfile && u.teacherCourseCount > 0) return false;
  return true;
}

export default function UsersShell(props: Props) {
  const { users, total, page, pageSize, classes, initialQuery, initialRole } = props;
  const router = useRouter();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === Role.SUPER_ADMIN;

  const [running, transition] = useTransition();
  const [flash, setFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<ListedUserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<ListedUserRow | null>(null);
  const [managingPermissions, setManagingPermissions] = useState<ListedUserRow | null>(null);
  const [accessDocumentUser, setAccessDocumentUser] = useState<ListedUserRow | null>(null);

  const handleExportCSV = async () => {
    const { default: Papa } = await import("papaparse");
    const data = users.map(u => ({
      Prénom: u.firstName,
      Nom: u.lastName,
      Email: u.email,
      Rôle: u.role,
      Classe: u.studentClass?.name || ""
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `skilla_users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { default: Papa } = await import("papaparse");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const payload = results.data.map((row: any) => ({
          firstName: row.Prénom || row.firstName || "",
          lastName: row.Nom || row.lastName || "",
          email: row.Email || row.email || "",
          role: (row.Rôle || row.role || "STUDENT") as Role,
          classId: row.Classe || row.classId || ""
        })).filter((u: any) => u.firstName && u.lastName);

        if (payload.length === 0) {
          setFlash({ type: "err", msg: "Aucune donnée valide trouvée dans le CSV." });
          return;
        }

        transition(async () => {
          const res = await importUsersAction(payload);
          if (res.ok) {
            setFlash({ type: "ok", msg: `${res.data?.count} utilisateurs importés/mis à jour avec succès.` });
            router.refresh();
          } else {
            setFlash({ type: "err", msg: res.error });
          }
        });
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildPageHref(pg: number, cursor?: string, dir?: 'prev' | 'next') {
    const p = new URLSearchParams();
    if (initialQuery.trim()) p.set("q", initialQuery.trim());
    if (initialRole) p.set("role", initialRole);
    if (pg > 1) p.set("page", String(pg));
    if (cursor) {
      p.set("cursor", cursor);
      if (dir) p.set("dir", dir);
    }
    const qs = p.toString();
    return qs ? `/admin/users?${qs}` : `/admin/users`;
  }

  return (
    <div className="h-full flex flex-col gap-6 font-sans text-slate-900">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase tracking-widest text-slate-900">
            Utilisateurs & Droits
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Gestion des comptes et profils d'accès
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
          <button type="button" onClick={handleExportCSV} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition shadow-sm">
            Export CSV
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-xl text-[10px] font-black text-sky-700 uppercase tracking-widest hover:bg-sky-100 transition shadow-sm">
            Import CSV
          </button>
          <button type="button" onClick={() => { setShowCreate(true); setFlash(null); }} className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition">
            + Nouveau
          </button>
        </div>
      </header>

      {flash && (
        <div className={`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest shrink-0 ${flash.type === "ok" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-700"}`}>
          {flash.msg}
        </div>
      )}

      <form method="GET" action="/admin/users" className="flex flex-col sm:flex-row items-end gap-3 shrink-0">
        <div className="flex-1 w-full">
          <span className="mb-1 block text-[9px] font-black text-slate-400 uppercase tracking-widest">Recherche</span>
          <input name="q" defaultValue={initialQuery} placeholder="E-mail, nom..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-blue-500/20" />
        </div>
        <div className="w-full sm:w-44">
          <span className="mb-1 block text-[9px] font-black text-slate-400 uppercase tracking-widest">Rôle</span>
          <select name="role" defaultValue={initialRole} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-blue-500/20">
            {ROLE_OPTIONS.map((o) => (
              <option key={`${String(o.value)}_${o.label}`} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button type="submit" className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">Filtrer</button>
          <Link href="/admin/users" className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition">Reset</Link>
        </div>
      </form>

      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{total} Comptes • Page {page}/{totalPages}</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
              <tr>
                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Nom</th>
                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Email</th>
                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Rôle</th>
                <th className="hidden px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] lg:table-cell">Profil</th>
                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic text-[10px]">Aucun résultat.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition group">
                    <td className="px-5 py-3">
                      <div className="font-black text-slate-900 uppercase tracking-tight">{u.lastName} {u.firstName}</div>
                      <div className="text-[9px] text-slate-400 font-medium mb-1">ID: {u.username}</div>
                      {u.hasStudentProfile && <span className="text-[8px] font-bold text-blue-500 uppercase tracking-tighter">Élève</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-medium">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${roleBadgeClasses(u.role)}`}>
                        {ROLE_EDIT_OPTIONS.find((r) => r.value === u.role)?.label ?? u.role}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 lg:table-cell text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {u.hasStudentProfile ? (u.studentClass?.name || "Sans classe") : u.hasTeacherProfile ? `${u.teacherCourseCount} cours` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <MessageButton recipientId={u.id} recipientName={`${u.lastName} ${u.firstName}`} />
                        {isSuperAdmin && u.role === Role.ADMIN && (
                            <button
                                onClick={() => setManagingPermissions(u)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-violet-600 uppercase tracking-widest hover:bg-violet-50"
                                title="Permissions"
                            >
                                <Key className="h-3 w-3" />
                            </button>
                        )}
                        <button
                          onClick={() => setAccessDocumentUser(u)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100"
                          title="Accès"
                        >
                            <FileText className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setEditingUser(u)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100"
                        >
                          Éditer
                        </button>
                        {canDeleteListedUser(u) && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="px-2 py-1 bg-red-50 border border-red-100 rounded-lg text-[9px] font-black text-red-600 uppercase tracking-widest hover:bg-red-600 hover:text-white transition"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 shrink-0 mt-2">
          <Link
            href={buildPageHref(page - 1, users[0]?.id, 'prev')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${
              page <= 1
                ? "pointer-events-none opacity-50 bg-slate-50 text-slate-400 border border-slate-100"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
            }`}
          >
            Précédent
          </Link>
          
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {page} / {totalPages}
          </span>
          
          <Link
            href={buildPageHref(page + 1, users[users.length - 1]?.id, 'next')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${
              page >= totalPages
                ? "pointer-events-none opacity-50 bg-slate-50 text-slate-400 border border-slate-100"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
            }`}
          >
            Suivant
          </Link>
        </div>
      )}

      {showCreate ? (
        <CreateUserModal
          classes={classes}
          onClose={() => setShowCreate(false)}
          pending={running}
          isSuperAdmin={isSuperAdmin}
          onSubmitRecord={(payload) =>
            transition(async () => {
              const res = await createUser(payload);
              setShowCreate(false);
              setFlash(
                res.ok
                  ? { type: "ok", msg: "Utilisateur créé avec succès." }
                  : { type: "err", msg: res.error },
              );
              router.refresh();
            })
          }
        />
      ) : null}

      {editingUser ? (
        <EditUserModal
          classes={classes}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          pending={running}
          isSuperAdmin={isSuperAdmin}
          onSubmitRecord={(input) =>
            transition(async () => {
              const res = await updateUser(input);
              setEditingUser(null);
              setFlash(
                res.ok
                  ? { type: "ok", msg: "Utilisateur mis à jour." }
                  : { type: "err", msg: res.error },
              );
              router.refresh();
            })
          }
        />
      ) : null}

      {deletingUser ? (
        <ConfirmDeleteModal
          label={`${deletingUser.lastName} ${deletingUser.firstName}`}
          pending={running}
          onClose={() => setDeletingUser(null)}
          onConfirm={() =>
            transition(async () => {
              const id = deletingUser.id;
              setDeletingUser(null);
              const res = await deleteUserSafe(id);
              setFlash(
                res.ok
                  ? { type: "ok", msg: "Utilisateur supprimé." }
                  : { type: "err", msg: res.error },
              );
              router.refresh();
            })
          }
        />
      ) : null}
      
      {managingPermissions ? (
          <AdminPermissionsModal
              user={managingPermissions}
              pending={running}
              onClose={() => setManagingPermissions(null)}
              onSave={(p) => transition(async () => {
                  const res = await updateAdminPermissions({
                userId: managingPermissions.id,
                ...p,
              });
                  setManagingPermissions(null);
                  setFlash(res.ok ? { type: "ok", msg: "Permissions mises à jour." } : { type: "err", msg: res.error });
                  router.refresh();
              })}
          />
      ) : null}
    </div>
  );
}

type CreateUserPayload = {
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: Role;
  classId?: string;
  phone?: string;
  company?: string;
};

function CreateUserModal({
  classes,
  pending,
  onClose,
  onSubmitRecord,
  isSuperAdmin,
}: {
  classes: ClassOption[];
  pending: boolean;
  onClose: () => void;
  onSubmitRecord: (p: CreateUserPayload) => void;
  isSuperAdmin: boolean;
}) {
  const [role, setRole] = useState<Role>(Role.STUDENT);

  return (
    <DialogPortal title="Nouvel utilisateur" onClose={onClose}>
      <form
        className="space-y-4 px-6 py-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const classIdRaw = String(fd.get("classId") ?? "");
          onSubmitRecord({
            email: String(fd.get("email") ?? "").trim() || undefined,
            password: String(fd.get("password") ?? ""),
            firstName: String(fd.get("firstName") ?? ""),
            lastName: String(fd.get("lastName") ?? ""),
            role,
            classId: role === Role.STUDENT ? classIdRaw : undefined,
            phone: String(fd.get("phone") ?? "").trim() || undefined,
            company: role === Role.COMPANY_TUTOR ? (String(fd.get("company") ?? "").trim() || undefined) : undefined,
          });
        }}
      >
        <Field label="Rôle *">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={inputClass}
          >
            {isSuperAdmin && <option value={Role.SUPER_ADMIN}>Super Administrateur</option>}
            <option value={Role.ADMIN}>Administrateur</option>
            <option value={Role.TEACHER}>Professeur</option>
            <option value={Role.STUDENT}>Élève</option>
            <option value={Role.RESPONSIBLE}>Responsable</option>
            <option value={Role.COMPANY_TUTOR}>Employeur</option>
          </select>
        </Field>

        {role === Role.STUDENT ? (
          <Field label="Classe (optionnelle)">
            <select name="classId" className={inputClass}>
              <option value="">Aucune classe</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {role === Role.COMPANY_TUTOR ? (
          <Field label="Entreprise *">
            <input name="company" required className={inputClass} placeholder="Ex: Google France" />
          </Field>
        ) : null}

        <Field label="Prénom *">
          <input name="firstName" required className={inputClass} />
        </Field>
        <Field label="Nom *">
          <input name="lastName" required className={inputClass} />
        </Field>
        <Field label="Téléphone (optionnel)">
          <input name="phone" type="tel" className={inputClass} placeholder="Ex: +33 6 12 34 56 78" />
        </Field>
        <Field label="E-mail (optionnel)">
          <input name="email" type="email" className={inputClass} />
        </Field>
        <Field label="Mot de passe *">
          <input
            name="password"
            type="password"
            minLength={8}
            required
            className={inputClass}
          />
        </Field>

        <ModalActions onCancel={onClose} submitLabel={pending ? "Création…" : "Créer"} disabled={pending} />
      </form>
    </DialogPortal>
  );
}

type UpdateUserPayload = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  newPassword?: string;
  studentClassId?: string;
  phone?: string;
  company?: string;
};

function EditUserModal({
  classes,
  user,
  pending,
  onClose,
  onSubmitRecord,
  isSuperAdmin,
}: {
  classes: ClassOption[];
  user: ListedUserRow;
  pending: boolean;
  onClose: () => void;
  onSubmitRecord: (p: UpdateUserPayload) => void;
  isSuperAdmin: boolean;
}) {
  const [role, setRole] = useState<Role>(user.role);
  const [isActive, setIsActive] = useState<boolean>(user.isActive);
  const roleLocked = user.lockedRole;
  const effectiveRole = roleLocked ? user.role : role;
  const showStudentClass = effectiveRole === Role.STUDENT;

  return (
    <DialogPortal
      title="Modifier le compte"
      subtitle={`${user.lastName} ${user.firstName}`}
      onClose={onClose}
    >
      <form
        className="space-y-4 px-6 py-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const newPassword = String(fd.get("newPassword") ?? "").trim();
          const classRaw = String(fd.get("studentClassId") ?? "").trim();
          onSubmitRecord({
            userId: user.id,
            email: String(fd.get("email") ?? ""),
            firstName: String(fd.get("firstName") ?? ""),
            lastName: String(fd.get("lastName") ?? ""),
            role: roleLocked ? user.role : role,
            isActive,
            newPassword: newPassword === "" ? undefined : newPassword,
            studentClassId:
              role === Role.STUDENT ? classRaw : undefined,
            phone: String(fd.get("phone") ?? "").trim() || undefined,
            company: effectiveRole === Role.COMPANY_TUTOR ? (String(fd.get("company") ?? "").trim() || undefined) : undefined,
          });
        }}
      >
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 mb-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">Statut du compte</span>
            <span className="text-[10px] text-slate-500 font-medium">L'utilisateur peut-il se connecter ?</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {user.hasStudentProfile ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950 ring-1 ring-amber-200/80">
            Le rôle « Élève » est figé tant qu&apos;un profil élève existe. Vous
            pouvez modifier la classe ci-dessous.
          </p>
        ) : null}
        {user.lockedRole && user.hasTeacherProfile ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950 ring-1 ring-amber-200/80">
            Le rôle ne peut pas être modifié tant que ce professeur a des cours
            assignés.
          </p>
        ) : null}

        {!roleLocked ? (
          <Field label="Rôle *">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              {isSuperAdmin && <option value={Role.SUPER_ADMIN}>Super Administrateur</option>}
              {ROLE_EDIT_OPTIONS.filter(r => r.value !== Role.SUPER_ADMIN).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
            </select>
          </Field>
        ) : null}

        {showStudentClass ? (
          <Field label="Classe (élève)">
            <select
              name="studentClassId"
              defaultValue={user.studentClass?.id ?? ""}
              className={inputClass}
            >
              <option value="">Aucune classe</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {effectiveRole === Role.COMPANY_TUTOR ? (
          <Field label="Entreprise *">
            <input
              name="company"
              required
              defaultValue={user.company ?? ""}
              className={inputClass}
              placeholder="Ex: Google France"
            />
          </Field>
        ) : null}

        <Field label="Prénom *">
          <input
            name="firstName"
            required
            defaultValue={user.firstName}
            className={inputClass}
          />
        </Field>
        <Field label="Nom *">
          <input name="lastName" required defaultValue={user.lastName} className={inputClass} />
        </Field>
        <Field label="Téléphone (optionnel)">
          <input
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            className={inputClass}
            placeholder="Ex: +33 6 12 34 56 78"
          />
        </Field>
        <Field label="E-mail (optionnel)">
          <input
            name="email"
            type="email"
            defaultValue={user.email}
            className={inputClass}
          />
        </Field>
        <Field label="Nouveau mot de passe (optionnel)">
          <input
            name="newPassword"
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="Laisser vide pour ne pas changer"
            className={inputClass}
          />
        </Field>

        <ModalActions
          onCancel={onClose}
          submitLabel={pending ? "Enregistrement…" : "Enregistrer"}
          disabled={pending}
        />
      </form>
    </DialogPortal>
  );
}

function ConfirmDeleteModal({
  label,
  pending,
  onClose,
  onConfirm,
}: {
  label: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogPortal title="Supprimer le compte ?" subtitle={label} onClose={onClose}>
      <p className="px-6 pb-2 text-sm text-slate-600">
        Cette action est définitive. Tous les contrats, notes et données associés à ce compte seront également supprimés.
      </p>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Suppression…" : "Confirmer"}
        </button>
      </div>
    </DialogPortal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function ModalActions({
  onCancel,
  submitLabel,
  disabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  disabled: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Annuler
      </button>
      <button
        disabled={disabled}
        type="submit"
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function AdminPermissionsModal({
  user,
  pending,
  onClose,
  onSave,
}: {
  user: ListedUserRow;
  pending: boolean;
  onClose: () => void;
  onSave: (p: any) => void;
}) {
  const [permissions, setPermissions] = useState({
    canManageUsers: user.canManageUsers,
    canManageSettings: user.canManageSettings,
    canManagePlanning: user.canManagePlanning,
    canManageRH: user.canManageRH,
    canAccessLivrets: user.canAccessLivrets,
  });

  return (
    <DialogPortal title="Droits Administrateur" subtitle={`${user.lastName} ${user.firstName}`} onClose={onClose}>
      <div className="p-6 space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
          Définissez les accès de cet administrateur
        </p>
        
        <div className="space-y-3">
          {[
            { key: 'canManageUsers', label: 'Gestion des Utilisateurs', icon: Shield },
            { key: 'canManageSettings', label: 'Configuration Système', icon: ShieldAlert },
            { key: 'canManagePlanning', label: 'Gestion de l\'Emploi du temps', icon: ShieldCheck },
            { key: 'canManageRH', label: 'Gestion RH & Contrats', icon: Shield },
            { key: 'canAccessLivrets', label: 'Accès aux Livrets', icon: ShieldCheck },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              </div>
              <input 
                type="checkbox" 
                checked={(permissions as any)[item.key]} 
                onChange={(e) => setPermissions({ ...permissions, [item.key]: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition">Annuler</button>
          <button 
            disabled={pending}
            onClick={() => onSave(permissions)}
            className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-slate-800 transition disabled:opacity-50"
          >
            {pending ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </DialogPortal>
  );
}

function DialogPortal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 p-0 sm:p-4 backdrop-blur-sm">
      <div className="max-h-[95vh] sm:max-h-[90vh] w-full sm:max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in slide-in-from-bottom sm:zoom-in duration-300">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-1 pb-10 sm:pb-1">
          {children}
        </div>
      </div>
    </div>
  );
}
