import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      /** Aligné sur `User.role` (Prisma). Présent dès que le JWT contient `role`. */
      role?: Role;
    };
  }

  /** Objet utilisateur renvoyé par Credentials `authorize`. */
  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}
