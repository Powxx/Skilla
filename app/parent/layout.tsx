import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import PortalHeaderShell from "@/components/portal/portal-header-shell";
import { authOptions } from "@/lib/auth-options";
import { listParentChildrenSerialized } from "@/lib/parent-access";

export default async function ParentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "PARENT" && session.user.role !== "EMPLOYER")
  ) {
    redirect("/login");
  }

  const parentChildren = await listParentChildrenSerialized(session.user.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PortalHeaderShell variant="parent" parentChildren={parentChildren} />
      {children}
    </div>
  );
}
