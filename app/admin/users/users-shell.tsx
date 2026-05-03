"use client";

import { Role } from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, deleteUserSafe, updateUser } from "./actions";

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
  { value: Role.ADMIN, label: "Administrateur" },
  { value: Role.TEACHER, label: "Professeur" },
  { value: Role.STUDENT, label: "Élève" },
  { value: Role.RESPONSIBLE, label: "Responsable" },
  { value: Role.COMPANY_TUTOR, label: "Employeur" },
];

const ROLE_EDIT_OPTIONS = ROLE_OPTIONS.filter((o) => o.value !== "");

function roleBadgeClasses(role: Role) {
  switch (role) {
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
  if (u.hasStudentProfile) return false;
  if (u.hasTeacherProfile && u.teacherCourseCount > 0) return false;
  return true;
}

export default function UsersShell(props: Props) {
  const { users, total, page, pageSize, classes, initialQuery, initialRole } =
    props;
  const router = useRouter();
  const [running, transition] = useTransition();
  const [flash, setFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null,
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<ListedUserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<ListedUserRow | null>(null);

  function buildPageHref(pg: number) {
    const p = new URLSearchParams();
    if (initialQuery.trim()) p.set("q", initialQuery.trim());
    if (initialRole) p.set("role", initialRole);
    if (pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    return qs ? `/admin/users?${qs}` : `/admin/users`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-8 text-sm text-slate-500">
        <Link href="/" className="font-medium hover:text-slate-700">
          Accueil
        </Link>
        <span className="mx-2 text-slate-300">/</span>
        <Link href="/admin" className="font-medium hover:text-slate-700">
          Admin
        </Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-900">Utilisateurs</span>
      </nav>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Utilisateurs & droits
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Recherche, filtre par rôle (ADMIN, TEACHER, STUDENT, PARENT, EMPLOYER) et gestion des comptes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setFlash(null);
          }}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Nouvel utilisateur
        </button>
      </header>

      {flash ? (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${flash.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
            }`}
          role={flash.type === "err" ? "alert" : "status"}
        >
          {flash.msg}
        </div>
      ) : null}

      <form
        method="GET"
        action="/admin/users"
        className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="block min-w-[12rem] flex-1">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Recherche
          </span>
          <input
            name="q"
            defaultValue={initialQuery}
            placeholder="E-mail, prénom, nom…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-sky-400/20 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/15"
          />
        </label>
        <label className="block w-full sm:w-56">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Rôle
          </span>
          <select
            name="role"
            defaultValue={initialRole}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-sky-400/20 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/15"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={`${String(o.value)}_${o.label}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
          >
            Filtrer
          </button>
          <Link
            href="/admin/users"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Réinitialiser
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-sm text-slate-600">
          <span>
            <strong className="text-slate-900">{total}</strong> compte(s) · page{" "}
            <strong className="text-slate-900">{page}</strong> /{" "}
            {totalPages}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="px-5 py-3 font-semibold text-slate-700">
                  Nom
                </th>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  E-mail
                </th>
                <th className="px-5 py-3 font-semibold text-slate-700">
                  Rôle
                </th>
                <th className="hidden px-5 py-3 font-semibold text-slate-700 lg:table-cell">
                  Profils
                </th>
                <th className="px-5 py-3 text-right font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Aucun utilisateur trouvé avec ces filtres.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">
                        {u.lastName} {u.firstName}
                      </div>
                      {u.hasStudentProfile ? (
                        <span className="mt-1 inline-flex text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Profil élève
                        </span>
                      ) : u.lockedRole && u.hasTeacherProfile ? (
                        <span className="mt-1 inline-flex text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Enseignant avec cours
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${roleBadgeClasses(
                          u.role,
                        )}`}
                      >
                        {ROLE_EDIT_OPTIONS.find((r) => r.value === u.role)
                          ?.label ?? u.role}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 text-xs text-slate-600 lg:table-cell">
                      {u.hasStudentProfile && u.studentClass ? (
                        <span>Élève · {u.studentClass.name}</span>
                      ) : u.hasTeacherProfile ? (
                        <span>Prof · {u.teacherCourseCount} cours</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setFlash(null);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                        >
                          Modifier
                        </button>
                        {canDeleteListedUser(u) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingUser(u);
                              setFlash(null);
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
                          >
                            Supprimer
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildPageHref(p)}
              className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium ${p === page
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
            >
              {p}
            </Link>
          ))}
        </div>
      ) : null}

      {showCreate ? (
        <CreateUserModal
          classes={classes}
          onClose={() => setShowCreate(false)}
          pending={running}
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
    </div>
  );
}

type CreateUserPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  classId?: string;
};

function CreateUserModal({
  classes,
  pending,
  onClose,
  onSubmitRecord,
}: {
  classes: ClassOption[];
  pending: boolean;
  onClose: () => void;
  onSubmitRecord: (p: CreateUserPayload) => void;
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
            email: String(fd.get("email") ?? ""),
            password: String(fd.get("password") ?? ""),
            firstName: String(fd.get("firstName") ?? ""),
            lastName: String(fd.get("lastName") ?? ""),
            role,
            classId: role === Role.STUDENT ? classIdRaw : undefined,
          });
        }}
      >
        <Field label="Rôle *">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={inputClass}
          >
            <option value={Role.ADMIN}>Administrateur</option>
            <option value={Role.TEACHER}>Professeur</option>
            <option value={Role.STUDENT}>Élève</option>
            <option value={Role.RESPONSIBLE}>Responsable</option>
            <option value={Role.COMPANY_TUTOR}>Employeur</option>
          </select>
        </Field>

        {role === Role.STUDENT ? (
          <Field label="Classe *">
            <select name="classId" required className={inputClass}>
              <option value="">Sélectionner…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field label="Prénom *">
          <input name="firstName" required className={inputClass} />
        </Field>
        <Field label="Nom *">
          <input name="lastName" required className={inputClass} />
        </Field>
        <Field label="E-mail *">
          <input name="email" type="email" required className={inputClass} />
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
  newPassword?: string;
  studentClassId?: string;
};

function EditUserModal({
  classes,
  user,
  pending,
  onClose,
  onSubmitRecord,
}: {
  classes: ClassOption[];
  user: ListedUserRow;
  pending: boolean;
  onClose: () => void;
  onSubmitRecord: (p: UpdateUserPayload) => void;
}) {
  const [role, setRole] = useState<Role>(user.role);
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
            newPassword: newPassword === "" ? undefined : newPassword,
            studentClassId:
              role === Role.STUDENT && classRaw !== "" ? classRaw : undefined,
          });
        }}
      >
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
              {ROLE_EDIT_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
            </select>
          </Field>
        ) : null}

        {showStudentClass ? (
          <Field
            label={user.hasStudentProfile ? "Classe (élève) *" : "Classe (nouvel élève) *"}
          >
            <select
              name="studentClassId"
              required={!user.hasStudentProfile}
              defaultValue={user.studentClass?.id ?? ""}
              className={inputClass}
            >
              {!user.hasStudentProfile ? (
                <option value="">Choisir…</option>
              ) : null}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
        <Field label="E-mail *">
          <input
            name="email"
            type="email"
            required
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
        Cette action est définitive. Les comptes avec profil élève ne peuvent pas être supprimés depuis cet écran.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
