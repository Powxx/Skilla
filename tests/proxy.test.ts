import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.fn();
vi.mock("next-auth/jwt", () => ({ getToken: (...args: unknown[]) => getToken(...args) }));

import { proxy } from "@/proxy";

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

beforeEach(() => {
  getToken.mockReset();
});

describe("proxy — routes API", () => {
  it("laisse passer les routes publiques sans session", async () => {
    for (const path of ["/api/auth/session", "/api/cron/cleanup-notifications", "/api/calendar/sync/abc", "/api/calendar/export?token=abc"]) {
      const res = await proxy(request(path));
      expect(res.status, path).toBe(200);
    }
    expect(getToken).not.toHaveBeenCalled();
  });

  it("renvoie 401 sans session", async () => {
    getToken.mockResolvedValue(null);
    const res = await proxy(request("/api/lessons"));
    expect(res.status).toBe(401);
  });

  it("renvoie 401 pour un jeton révoqué", async () => {
    getToken.mockResolvedValue({ revoked: true });
    const res = await proxy(request("/api/lessons"));
    expect(res.status).toBe(401);
  });

  it("renvoie 403 sur /api/admin pour un non-admin", async () => {
    getToken.mockResolvedValue({ id: "t1", role: "TEACHER" });
    const res = await proxy(request("/api/admin/classes"));
    expect(res.status).toBe(403);
  });

  it("autorise /api/admin pour un admin", async () => {
    getToken.mockResolvedValue({ id: "a1", role: "ADMIN" });
    const res = await proxy(request("/api/admin/classes"));
    expect(res.status).toBe(200);
  });
});

describe("proxy — pages", () => {
  it("redirige vers /login sans session", async () => {
    getToken.mockResolvedValue(null);
    const res = await proxy(request("/admin/users"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("refuse l'espace admin à un élève", async () => {
    getToken.mockResolvedValue({ id: "s1", role: "STUDENT" });
    const res = await proxy(request("/admin"));
    expect(res.headers.get("location")).toContain("/login");
  });
});
