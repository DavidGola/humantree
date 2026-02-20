import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../components/Modal";

describe("Modal", () => {
  const defaultProps = {
    title: "Test Modal",
    onClose: vi.fn(),
  };

  it("affiche le titre", () => {
    render(
      <Modal {...defaultProps}>
        <p>Contenu</p>
      </Modal>,
    );
    expect(screen.getByText("Test Modal")).toBeDefined();
  });

  it("affiche le contenu enfant", () => {
    render(
      <Modal {...defaultProps}>
        <p>Mon contenu</p>
      </Modal>,
    );
    expect(screen.getByText("Mon contenu")).toBeDefined();
  });

  it("appelle onClose au clic sur le bouton fermer", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Test" onClose={onClose}>
        <p>Contenu</p>
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText("Fermer la modale"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("appelle onClose au clic sur le backdrop", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Test" onClose={onClose}>
        <p>Contenu</p>
      </Modal>,
    );
    // Le backdrop est le premier div (fixed inset-0)
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ne ferme PAS au clic sur le contenu du modal", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Test" onClose={onClose}>
        <p>Contenu</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText("Contenu"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("appelle onClose quand on appuie sur Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Test" onClose={onClose}>
        <p>Contenu</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ne ferme PAS quand on appuie sur une autre touche", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Test" onClose={onClose}>
        <p>Contenu</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
