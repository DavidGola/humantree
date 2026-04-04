import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

vi.mock("../api/userApi", () => ({
  userApi: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue({}),
    getProfile: vi.fn().mockRejectedValue(new Error("no session")),
  },
}));

vi.mock("react-hot-toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("useAuth", () => {
  it("throws si utilisé hors AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within AuthProvider",
    );
  });

  it("état initial : non authentifié, username vide", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.username).toBe("");
    expect(result.current.isLoggingIn).toBe(false);
  });

  it("logout remet isAuthenticated à false et vide username", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => result.current.logout());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.username).toBe("");
  });

  it("logout supprime username du localStorage", () => {
    localStorage.setItem("username", "alice");
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => result.current.logout());
    expect(localStorage.getItem("username")).toBeNull();
  });

  it("l'événement auth:logout force la déconnexion", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      window.dispatchEvent(new Event("auth:logout"));
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.username).toBe("");
    });
  });

  it("sans username en localStorage, ne tente pas de restaurer la session", async () => {
    const { userApi } = await import("../api/userApi");
    renderHook(() => useAuth(), { wrapper: AuthProvider });
    await new Promise((r) => setTimeout(r, 50));
    expect(userApi.getProfile).not.toHaveBeenCalled();
  });

  it("avec username en localStorage, tente de restaurer la session via getProfile", async () => {
    const { userApi } = await import("../api/userApi");
    vi.mocked(userApi.getProfile).mockResolvedValueOnce({
      username: "alice",
      email: "alice@example.com",
      id: 1,
    } as never);
    localStorage.setItem("username", "alice");

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.username).toBe("alice");
    });
  });

  it("session expirée (getProfile échoue) → reste non authentifié et nettoie localStorage", async () => {
    localStorage.setItem("username", "alice");
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });

    expect(localStorage.getItem("username")).toBeNull();
  });
});
