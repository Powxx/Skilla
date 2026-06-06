import type { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import UsersShell, { type ListedUserRow } from "./users-shell";

const PAGE_SIZE = 15;

function getParam(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

function parseRole(raw: string | undefined): Role | undefined {
  if (!raw?.trim()) return undefined;
  const cleaned = raw.trim().toUpperCase();
  const allowed = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "RESPONSIBLE", "COMPANY_TUTOR"] as const;
  if (!allowed.includes(cleaned as (typeof allowed)[number])) return undefined;
  return cleaned as Role;
}

export default async function UsersDataFetcher({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const searchParams = await searchParamsPromise;
  
  const q = getParam(searchParams?.q)?.trim() ?? "";
  const roleRaw = getParam(searchParams?.role)?.trim() ?? "";
  const roleFilter = parseRole(roleRaw);
  
  const cursorParam = getParam(searchParams?.cursor)?.trim();
  const dir = getParam(searchParams?.dir) === 'prev' ? 'prev' : 'next';
  
  const pageRaw = Number.parseInt(getParam(searchParams?.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

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

  const where = clauses.length > 0 ? { AND: clauses } : {};

  const take = dir === 'prev' ? -PAGE_SIZE : PAGE_SIZE;
  const skip = cursorParam ? 1 : 0;

  const [total, rawUsers, classes] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
      cursor: cursorParam ? { id: cursorParam } : undefined,
      skip,
      take,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        class: { select: { id: true, name: true } }, 
        studentProfile: { select: { id: true } },
        contract: { select: { id: true } },
        canAccessLivrets: true,
        canManageUsers: true,
        canManageSettings: true,
        canManagePlanning: true,
        canManageRH: true,
        canImpersonate: true,
        _count: { select: { lessons: true } },
      },
    }),
    prisma.class.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  
  const users: ListedUserRow[] = rawUsers.map((u) => {
    const hasStudentProfile = !!u.studentProfile;
    const hasTeacherProfile = !!u.contract;
  
    const teacherCourseCount = u._count?.lessons ?? 0;
  
    return {
      id: u.id,
      email: u.email || "", 
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      role: u.role,
      lockedRole: hasStudentProfile || (hasTeacherProfile && teacherCourseCount > 0),
      hasStudentProfile,
      hasTeacherProfile,
      studentClass: u.class ?? null,
      teacherCourseCount,
      canAccessLivrets: u.canAccessLivrets,
      canManageUsers: u.canManageUsers,
      canManageSettings: u.canManageSettings,
      canManagePlanning: u.canManagePlanning,
      canManageRH: u.canManageRH,
      canImpersonate: u.canImpersonate,
    };
  });

  return (
    <UsersShell
      users={users}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      classes={classes}
      initialQuery={q}
      initialRole={roleRaw}
    />
  );
}
