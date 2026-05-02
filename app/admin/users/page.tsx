import type { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import UsersShell, { type ListedUserRow } from "./users-shell";

export const metadata = {
  title: "Utilisateurs — Administration",
};

const PAGE_SIZE = 15;

function getParam(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

function parseRole(raw: string | undefined): Role | undefined {
  if (!raw?.trim()) return undefined;
  const cleaned = raw.trim().toUpperCase();
  const allowed = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
  if (!allowed.includes(cleaned as (typeof allowed)[number])) return undefined;
  return cleaned as Role;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const q = getParam(searchParams?.q)?.trim() ?? "";
  const roleRaw = getParam(searchParams?.role)?.trim() ?? "";
  const roleFilter = parseRole(roleRaw);
  const pageRaw = Number.parseInt(getParam(searchParams?.page) ?? "1", 10);
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const clauses: Prisma.UserWhereInput[] = [];

  if (roleFilter) {
    clauses.push({ role: roleFilter });
  }

  if (q.length > 0) {
    clauses.push({
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where =
    clauses.length > 0
      ? { AND: clauses }
      : {};

  const [total, rawUsers, classes] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        studentProfile: {
          select: {
            class: { select: { id: true, name: true } },
          },
        },
        teacherProfile: {
          select: {
            id: true,
            _count: { select: { courses: true } },
          },
        },
      },
    }),
    prisma.class.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const users: ListedUserRow[] = rawUsers.map((u) => {
    const hasStudentProfile = !!u.studentProfile;
    const hasTeacherProfile = !!u.teacherProfile;

    const teacherCourseCount = u.teacherProfile?._count.courses ?? 0;

    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      lockedRole:
        hasStudentProfile ||
        (hasTeacherProfile && teacherCourseCount > 0),
      hasStudentProfile,
      hasTeacherProfile,
      studentClass: u.studentProfile?.class ?? null,
      teacherCourseCount,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <UsersShell
        users={users}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        classes={classes}
        initialQuery={q}
        initialRole={roleRaw}
      />
    </div>
  );
}
