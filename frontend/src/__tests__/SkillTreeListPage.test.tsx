import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock dependencies
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, username: "", login: vi.fn(), logout: vi.fn() }),
}));

vi.mock("../contexts/ThemeContext", () => ({
  useTheme: () => ({ isDarkMode: false, toggleDarkMode: vi.fn() }),
}));

vi.mock("../hooks/useFavorites", () => ({
  useFavorites: () => ({ favoriteTrees: [], handleFavorite: vi.fn() }),
}));

vi.mock("../api/skillTreeApi", () => ({
  skillTreeApi: {
    getAll: vi.fn().mockResolvedValue([
      { id: 1, name: "JavaScript", description: "Langage web", creator_username: "alice", created_at: "2024-01-01" },
      { id: 2, name: "Python", description: "Langage polyvalent", creator_username: "bob", created_at: "2024-01-02" },
      { id: 3, name: "DevOps", description: "Infrastructure et CI/CD", creator_username: "alice", created_at: "2024-01-03" },
    ]),
    getTrendings: vi.fn().mockResolvedValue([]),
    getMyTrees: vi.fn().mockResolvedValue([]),
    getMyFavorites: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

import SkillTreeListPage from "../pages/SkillTreeListPage";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SkillTreeListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SkillTreeListPage - Recherche", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche la barre de recherche", async () => {
    renderPage();
    expect(
      screen.getByPlaceholderText("Rechercher un arbre de compétences..."),
    ).toBeDefined();
  });

  it("affiche tous les arbres par défaut", async () => {
    renderPage();
    expect(await screen.findByText("JavaScript")).toBeDefined();
    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.getByText("DevOps")).toBeDefined();
  });

  it("filtre par nom", async () => {
    renderPage();
    await screen.findByText("JavaScript");

    const searchInput = screen.getByPlaceholderText(
      "Rechercher un arbre de compétences...",
    );
    fireEvent.change(searchInput, { target: { value: "python" } });

    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.queryByText("JavaScript")).toBeNull();
    expect(screen.queryByText("DevOps")).toBeNull();
  });

  it("filtre par description", async () => {
    renderPage();
    await screen.findByText("JavaScript");

    const searchInput = screen.getByPlaceholderText(
      "Rechercher un arbre de compétences...",
    );
    fireEvent.change(searchInput, { target: { value: "CI/CD" } });

    expect(screen.getByText("DevOps")).toBeDefined();
    expect(screen.queryByText("JavaScript")).toBeNull();
    expect(screen.queryByText("Python")).toBeNull();
  });

  it("filtre par nom du créateur", async () => {
    renderPage();
    await screen.findByText("JavaScript");

    const searchInput = screen.getByPlaceholderText(
      "Rechercher un arbre de compétences...",
    );
    fireEvent.change(searchInput, { target: { value: "bob" } });

    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.queryByText("JavaScript")).toBeNull();
    expect(screen.queryByText("DevOps")).toBeNull();
  });

  it("affiche un message quand aucun résultat", async () => {
    renderPage();
    await screen.findByText("JavaScript");

    const searchInput = screen.getByPlaceholderText(
      "Rechercher un arbre de compétences...",
    );
    fireEvent.change(searchInput, { target: { value: "zzzzz" } });

    expect(
      screen.getByText("Aucun résultat pour cette recherche."),
    ).toBeDefined();
  });

  it("est insensible à la casse", async () => {
    renderPage();
    await screen.findByText("JavaScript");

    const searchInput = screen.getByPlaceholderText(
      "Rechercher un arbre de compétences...",
    );
    fireEvent.change(searchInput, { target: { value: "JAVASCRIPT" } });

    expect(screen.getByText("JavaScript")).toBeDefined();
  });

  it("réaffiche tous les arbres quand on vide la recherche", async () => {
    renderPage();
    await screen.findByText("JavaScript");

    const searchInput = screen.getByPlaceholderText(
      "Rechercher un arbre de compétences...",
    );
    fireEvent.change(searchInput, { target: { value: "python" } });
    expect(screen.queryByText("JavaScript")).toBeNull();

    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("JavaScript")).toBeDefined();
    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.getByText("DevOps")).toBeDefined();
  });
});
