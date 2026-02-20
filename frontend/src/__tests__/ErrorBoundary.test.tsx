import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../components/ErrorBoundary";

// Composant qui throw une erreur volontairement
function BrokenComponent(): React.ReactNode {
  throw new Error("Boom!");
}

function WorkingComponent() {
  return <p>Tout va bien</p>;
}

describe("ErrorBoundary", () => {
  // Supprimer les console.error de React pour ne pas polluer les logs de test
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("affiche les enfants quand il n'y a pas d'erreur", () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Tout va bien")).toBeDefined();
  });

  it("affiche le message d'erreur quand un enfant crash", () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Une erreur est survenue")).toBeDefined();
    expect(
      screen.getByText(
        "Quelque chose s'est mal passe. Veuillez recharger la page.",
      ),
    ).toBeDefined();
  });

  it("affiche un bouton pour recharger la page", () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Recharger la page")).toBeDefined();
  });
});
