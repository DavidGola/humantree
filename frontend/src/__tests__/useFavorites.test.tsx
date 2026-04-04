import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mocks hoistés avant les imports réels
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/skillTreeApi", () => ({
  skillTreeApi: {
    getMyFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

// Imports statiques des mocks
import { useAuth } from "../contexts/AuthContext";
import { skillTreeApi } from "../api/skillTreeApi";
import toast from "react-hot-toast";
import { useFavorites } from "../hooks/useFavorites";

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useFavorites", () => {
  it("retourne une liste vide quand non authentifié", () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as never);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.favoriteTrees).toEqual([]);
  });

  it("n'appelle pas getMyFavorites quand non authentifié", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as never);

    renderHook(() => useFavorites(), { wrapper: makeWrapper() });
    await new Promise((r) => setTimeout(r, 50));

    expect(skillTreeApi.getMyFavorites).not.toHaveBeenCalled();
  });

  it("handleFavorite sans auth affiche un toast d'erreur", () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as never);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: makeWrapper(),
    });

    act(() => result.current.handleFavorite(42));

    expect(toast.error).toHaveBeenCalledWith(
      "Vous devez être connecté pour ajouter aux favoris.",
    );
  });

  it("charge les favoris quand authentifié", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as never);
    vi.mocked(skillTreeApi.getMyFavorites).mockResolvedValue([
      { id: 1 } as never,
      { id: 3 } as never,
    ]);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.favoriteTrees).toEqual([1, 3]);
    });
  });

  it("handleFavorite ajoute un favori si pas encore favori", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as never);
    vi.mocked(skillTreeApi.getMyFavorites).mockResolvedValue([]);
    vi.mocked(skillTreeApi.addFavorite).mockResolvedValue(true as never);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.favoriteTrees).toEqual([]));
    act(() => result.current.handleFavorite(5));

    await waitFor(() => {
      expect(skillTreeApi.addFavorite).toHaveBeenCalledWith(5);
    });
  });

  it("handleFavorite retire un favori si déjà favori", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as never);
    vi.mocked(skillTreeApi.getMyFavorites).mockResolvedValue([
      { id: 5 } as never,
    ]);
    vi.mocked(skillTreeApi.removeFavorite).mockResolvedValue(true as never);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.favoriteTrees).toContain(5));
    act(() => result.current.handleFavorite(5));

    await waitFor(() => {
      expect(skillTreeApi.removeFavorite).toHaveBeenCalledWith(5);
    });
  });
});
