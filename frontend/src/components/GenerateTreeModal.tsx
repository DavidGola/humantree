import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { aiApi, type GeneratedTree } from "../api/aiApi";
import { apiKeyApi } from "../api/apiKeyApi";
import { skillTreeApi } from "../api/skillTreeApi";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/apiErrors";

interface GenerateTreeModalProps {
  onClose: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  generating: "Génération de l'arbre...",
  evaluating: "Évaluation de la qualité...",
  improving: "Amélioration en cours...",
};

export default function GenerateTreeModal({ onClose }: GenerateTreeModalProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [generated, setGenerated] = useState<GeneratedTree | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: apiKeyApi.list,
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenerateError(null);
    setPhase("generating");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await aiApi.generateTreeStream(
        prompt,
        provider,
        (event) => {
          if (event.type === "progress") {
            setPhase(event.phase);
          } else if (event.type === "done") {
            setGenerated(event.data);
          } else if (event.type === "error") {
            setGenerateError(event.detail);
          }
        },
        abort.signal,
      );
    } catch (e: unknown) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setGenerateError(getApiErrorMessage(e));
      }
    } finally {
      setIsGenerating(false);
      setPhase(null);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (tree: GeneratedTree) => {
      const created = await skillTreeApi.create(
        tree.name,
        tree.description,
        tree.tags
      );
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
        <div className="mt-4">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  if (generated) {
    return (
      <Modal title="Arbre généré" onClose={onClose} size="large">
        <div className="overflow-y-auto flex-1">
          <div className="mb-4">
            <h3 className="text-lg font-display font-semibold text-gray-800 dark:text-white">
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
                    className="px-2 py-0.5 text-xs rounded-full bg-primary-100/60 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-display font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
              {generated.skills.length} skills
            </p>
            {generated.skills.map((skill) => (
              <div
                key={skill.id}
                className={`p-3 rounded-lg ${
                  skill.is_root
                    ? "surface-strong"
                    : "surface-card"
                }`}
              >
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {skill.is_root && (
                    <span className="text-xs font-display font-semibold text-primary-600 dark:text-primary-400 mr-1">
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

        <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <Button
            variant="primary"
            onClick={() => createMutation.mutate(generated)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Création..." : "Créer cet arbre"}
          </Button>
          <Button variant="secondary" onClick={() => setGenerated(null)}>
            Régénérer
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
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
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-display font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
            Décrivez le sujet de l'arbre de compétences
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Ex: Apprendre le développement web frontend avec React..."
            className="w-full px-3 py-2.5 text-sm rounded-lg surface-input focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            {prompt.length}/500
          </p>
        </div>

        {keys.length > 1 && (
          <div>
            <label className="block text-xs font-display font-semibold text-gray-500 dark:text-slate-400 mb-1">
              Provider
            </label>
            <select
              value={provider ?? ""}
              onChange={(e) =>
                setProvider(e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm rounded-lg surface-input text-gray-800 dark:text-white outline-none"
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

        <div className="space-y-2 pt-2">
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? "En cours..." : "Générer"}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
          </div>

          {isGenerating && phase && (
            <p className="text-xs text-primary-500 dark:text-primary-400 animate-pulse">
              {PHASE_LABELS[phase] ?? "Traitement..."}
            </p>
          )}

          {generateError && (
            <p className="text-xs text-red-500">{generateError}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
