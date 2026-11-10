import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

import { hasAdminPermission, isGeneralAdminUser } from "@/lib/authz";

function user(overrides: Partial<Session["user"]>): Session["user"] {
  return {
    id: "u1",
    role: "ADMIN",
    canAccessLivrets: false,
    canManageUsers: false,
    canManageSettings: false,
    canManagePlanning: false,
    canManageRH: false,
    canImpersonate: false,
    isGeneralAdmin: false,
    ...overrides,
  };
}

describe("hasAdminPermission", () => {
  it("refuse sans session", () => {
    expect(hasAdminPermission(null, "canManageUsers")).toBe(false);
  });

  it("refuse un non-admin même avec le drapeau coché", () => {
    expect(hasAdminPermission(user({ role: "TEACHER", canManagePlanning: true }), "canManagePlanning")).toBe(false);
  });

  it("refuse un ADMIN sans la permission", () => {
    expect(hasAdminPermission(user({ canManageSettings: true }), "canManageUsers")).toBe(false);
  });

  it("autorise un ADMIN avec la permission", () => {
    expect(hasAdminPermission(user({ canManageRH: true }), "canManageRH")).toBe(true);
  });

  it("autorise toujours un SUPER_ADMIN et l'administrateur général", () => {
    expect(hasAdminPermission(user({ role: "SUPER_ADMIN" }), "canManageUsers")).toBe(true);
    expect(hasAdminPermission(user({ isGeneralAdmin: true }), "canManageSettings")).toBe(true);
    expect(isGeneralAdminUser(user({ isGeneralAdmin: true }))).toBe(true);
    expect(isGeneralAdminUser(user({}))).toBe(false);
  });
});
