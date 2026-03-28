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
    <Modal onClose={onClose} size="large" title="Détail de la compétence">
      <div className="flex flex-col min-h-[450px] max-h-[calc(85vh-3rem)]">
        {/* Nom de la compétence */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
            Nom de la compétence
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full px-4 py-3 text-lg font-semibold rounded-xl border-2 border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-500 focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition-all shadow-sm"
              placeholder="Ex: Apprendre les bases de Python"
            />
          ) : (
            <p className="text-lg font-semibold text-gray-900 dark:text-white px-1">
              {skill.name}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Description
            </label>
            {isEditing && (
              <button
                type="button"
                onClick={handleEnrich}
                disabled={isEnriching || !editedName.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 text-primary-700 dark:text-primary-300 bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 dark:hover:border-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isEnriching ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enrichissement...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    Enrichir avec l'IA
                  </>
                )}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2 px-1">
            Texte, images, vidéos, liens...
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border-2 border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
            <RichTextEditor
              content={editedDescription}
              onChange={setEditedDescription}
              editable={isEditing}
              placeholder="Décrivez cette compétence, ajoutez des ressources..."
            />
          </div>
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
