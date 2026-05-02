import prisma from "@/lib/prisma";
import AppelClient from "./appel-client";

export const metadata = {
  title: "Appel — Professeur",
};

export default async function ProfAppelPage() {
  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <AppelClient classes={classes} />;
}
