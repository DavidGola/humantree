import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkillDetailModal } from "../components/SkillDetailModal";
import type { Skill } from "../types/skillTree";

// Mock RichTextEditor — Tiptap needs real DOM, not jsdom
vi.mock("../components/RichTextEditor", () => ({
  RichTextEditor: ({
    content,
    editable,
    onChange,
  }: {
    content: string;
    editable: boolean;
    onChange: (html: string) => void;
  }) => (
    <div data-testid="rich-text-editor" data-editable={editable}>
      <div data-testid="editor-content">{content}</div>
      {editable && (
        <textarea
          data-testid="editor-textarea"
          value={content}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  ),
}));

const mockSkill: Skill = {
  id: 1,
  name: "JavaScript",
  description: "<p>Une description</p>",
  is_root: false,
  unlock_ids: [2, 3],
};

describe("SkillDetailModal", () => {
  const defaultProps = {
    skill: mockSkill,
    isEditing: false,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
  };

  it("affiche le nom de la compétence en mode lecture", () => {
    render(<SkillDetailModal {...defaultProps} />);
    expect(screen.getByText("JavaScript")).toBeDefined();
  });

  it("affiche l'éditeur en mode non-éditable en lecture", () => {
    render(<SkillDetailModal {...defaultProps} />);
    const editor = screen.getByTestId("rich-text-editor");
    expect(editor.dataset.editable).toBe("false");
  });

  it("affiche le bouton Fermer en mode lecture", () => {
    render(<SkillDetailModal {...defaultProps} />);
    expect(screen.getByText("Fermer")).toBeDefined();
  });

  it("n'affiche PAS les boutons d'édition en mode lecture", () => {
    render(<SkillDetailModal {...defaultProps} />);
    expect(screen.queryByText("Enregistrer")).toBeNull();
    expect(screen.queryByText("Supprimer")).toBeNull();
  });

  it("affiche un input pour le nom en mode édition", () => {
    render(<SkillDetailModal {...defaultProps} isEditing={true} />);
    const input = screen.getByPlaceholderText("Nom de la compétence");
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe("JavaScript");
  });

  it("affiche l'éditeur en mode éditable en édition", () => {
    render(<SkillDetailModal {...defaultProps} isEditing={true} />);
    const editor = screen.getByTestId("rich-text-editor");
    expect(editor.dataset.editable).toBe("true");
  });

  it("affiche les boutons Enregistrer, Annuler et Supprimer en mode édition", () => {
    render(<SkillDetailModal {...defaultProps} isEditing={true} />);
    expect(screen.getByText("Enregistrer")).toBeDefined();
    expect(screen.getByText("Annuler")).toBeDefined();
    expect(screen.getByText("Supprimer")).toBeDefined();
  });

  it("appelle onSave avec le skill mis à jour", () => {
    const onSave = vi.fn();
    render(
      <SkillDetailModal {...defaultProps} isEditing={true} onSave={onSave} />,
    );

    // Modifier le nom
    const input = screen.getByPlaceholderText("Nom de la compétence");
    fireEvent.change(input, { target: { value: "TypeScript" } });

    // Cliquer sur Enregistrer
    fireEvent.click(screen.getByText("Enregistrer"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedSkill = onSave.mock.calls[0][0];
    expect(savedSkill.name).toBe("TypeScript");
    expect(savedSkill.id).toBe(1);
  });

  it("appelle onDelete avec l'id du skill", () => {
    const onDelete = vi.fn();
    render(
      <SkillDetailModal
        {...defaultProps}
        isEditing={true}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Supprimer"));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("appelle onClose quand on clique sur Annuler", () => {
    const onClose = vi.fn();
    render(
      <SkillDetailModal
        {...defaultProps}
        isEditing={true}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("Annuler"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("appelle onClose quand on clique sur Fermer", () => {
    const onClose = vi.fn();
    render(<SkillDetailModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Fermer"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
