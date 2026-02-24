import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { RichTextEditor } from "./RichTextEditor";
import type { Skill } from "../types/skillTree";

interface SkillDetailModalProps {
  skill: Skill;
  isEditing: boolean;
  onClose: () => void;
  onSave: (skill: Skill) => void;
  onDelete: (skillId: number) => void;
}

export const SkillDetailModal = ({
  skill,
  isEditing,
  onClose,
  onSave,
  onDelete,
}: SkillDetailModalProps) => {
  const [editedName, setEditedName] = useState(skill.name);
  const [editedDescription, setEditedDescription] = useState(
    skill.description || "",
  );

  useEffect(() => {
    setEditedName(skill.name);
    setEditedDescription(skill.description || "");
  }, [skill.id]);

  const handleSave = () => {
    onSave({
      ...skill,
      name: editedName,
      description: editedDescription || null,
    });
  };

  return (
    <Modal onClose={onClose} size="large">
      <div className="flex flex-col min-h-[450px] max-h-[calc(85vh-3rem)]">
        {/* Title */}
        <div className="mb-6">
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-600"
              placeholder="Nom de la compétence"
            />
          ) : (
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {skill.name}
            </h2>
          )}
        </div>

        {/* Rich text content */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-lg">
          <RichTextEditor
            content={editedDescription}
            onChange={setEditedDescription}
            editable={isEditing}
            placeholder="Commencez à écrire..."
          />
        </div>

        {/* Footer */}
        {isEditing ? (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onDelete(skill.id)}
              className="text-sm text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Supprimer
            </button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end pt-4 mt-4 border-t border-gray-100 dark:border-slate-700">
            <Button variant="secondary" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
