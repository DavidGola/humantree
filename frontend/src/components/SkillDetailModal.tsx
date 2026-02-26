import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { RichTextEditor } from "./RichTextEditor";
import { aiApi } from "../api/aiApi";
import type { Skill } from "../types/skillTree";

interface SkillDetailModalProps {
  skill: Skill;
  isEditing: boolean;
  treeName?: string;
  treeDescription?: string;
  onClose: () => void;
  onSave: (skill: Skill) => void;
  onDelete: (skillId: number) => void;
}

export const SkillDetailModal = ({
  skill,
  isEditing,
  treeName,
  treeDescription,
  onClose,
  onSave,
  onDelete,
}: SkillDetailModalProps) => {
  const [editedName, setEditedName] = useState(skill.name);
  const [editedDescription, setEditedDescription] = useState(
    skill.description || "",
  );
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    setEditedName(skill.name);
    setEditedDescription(skill.description || "");
  }, [skill.id]);

  const handleEnrich = async () => {
    if (!editedName.trim()) return;
    setIsEnriching(true);
    try {
      const result = await aiApi.enrichSkill({
        skillName: editedName,
        treeName,
        treeDescription,
        currentDescription: editedDescription || undefined,
      });
      setEditedDescription(result.description);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      toast.error(message || "Erreur lors de l'enrichissement IA");
    } finally {
      setIsEnriching(false);
    }
  };

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

        {/* AI enrich button */}
        {isEditing && (
          <div className="mb-3">
            <button
              type="button"
              onClick={handleEnrich}
              disabled={isEnriching || !editedName.trim()}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEnriching ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enrichissement...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  Enrichir avec l'IA
                </>
              )}
            </button>
          </div>
        )}

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
