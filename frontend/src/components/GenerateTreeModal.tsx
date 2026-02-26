import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "./Modal";
import { aiApi, type GeneratedTree } from "../api/aiApi";
import { apiKeyApi } from "../api/apiKeyApi";
import { skillTreeApi } from "../api/skillTreeApi";
import { useNavigate } from "react-router-dom";

interface GenerateTreeModalProps {
  onClose: () => void;
}

export default function GenerateTreeModal({ onClose }: GenerateTreeModalProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [generated, setGenerated] = useState<GeneratedTree | null>(null);

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: apiKeyApi.list,
  });

  const generateMutation = useMutation({
    mutationFn: () => aiApi.generateTree(prompt, provider),
    onSuccess: (data) => setGenerated(data),
  });

  const createMutation = useMutation({
    mutationFn: async (tree: GeneratedTree) => {
      // 1. Créer l'arbre vide
      const created = await skillTreeApi.create(
        tree.name,
        tree.description,
        tree.tags
      );
      // 2. Sauvegarder avec les skills (IDs négatifs gérés par le backend)
      await skillTreeApi.save(String(created.id), {
        ...created,
        skills: tree.skills,
      });
      return created;
    },
    onSuccess: (data) => {
      onClose();
      navigate(`/tree/${data.id}`);
    },
  });

  if (keys.length === 0) {
    return (
      <Modal title="Générer un arbre par IA" onClose={onClose}>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Vous devez d'abord configurer une clé API dans votre profil pour
          utiliser la génération IA.
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Fermer
        </button>
      </Modal>
    );
  }

  if (generated) {
    return (
      <Modal title="Arbre généré" onClose={onClose} size="large">
        <div className="overflow-y-auto flex-1">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {generated.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
              {generated.description}
            </p>
            {generated.tags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {generated.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
              {generated.skills.length} skills
            </p>
            {generated.skills.map((skill) => (
              <div
                key={skill.id}
                className={`p-3 rounded-lg border ${
                  skill.is_root
                    ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-slate-700"
                }`}
              >
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {skill.is_root && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 mr-1">
                      ROOT
                    </span>
                  )}
                  {skill.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {skill.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={() => createMutation.mutate(generated)}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? "Création..." : "Créer cet arbre"}
          </button>
          <button
            onClick={() => setGenerated(null)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Régénérer
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Annuler
          </button>
        </div>
        {createMutation.isError && (
          <p className="mt-2 text-xs text-red-500">
            Erreur lors de la création de l'arbre.
          </p>
        )}
      </Modal>
    );
  }

  return (
    <Modal title="Générer un arbre par IA" onClose={onClose}>
      <div>
        <label className="block text-sm text-gray-600 dark:text-slate-300 mb-2">
          Décrivez le sujet de l'arbre de compétences
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ex: Apprendre le développement web frontend avec React..."
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
        />
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
          {prompt.length}/500
        </p>
      </div>

      {keys.length > 1 && (
        <div className="mt-3">
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
            Provider
          </label>
          <select
            value={provider ?? ""}
            onChange={(e) =>
              setProvider(e.target.value || undefined)
            }
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white outline-none"
          >
            <option value="">Auto (premier configuré)</option>
            {keys.map((k) => (
              <option key={k.provider} value={k.provider}>
                {k.provider === "google"
                  ? "Google (Gemini)"
                  : k.provider === "anthropic"
                    ? "Anthropic (Claude)"
                    : "OpenAI (GPT)"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !prompt.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {generateMutation.isPending ? "Génération en cours..." : "Générer"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Annuler
        </button>
      </div>
      {generateMutation.isError && (
        <p className="mt-2 text-xs text-red-500">
          {(generateMutation.error as any)?.response?.data?.detail ??
            "Erreur lors de la génération."}
        </p>
      )}
    </Modal>
  );
}
