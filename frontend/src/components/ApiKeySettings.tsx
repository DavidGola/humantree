import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiKeyApi, type ApiKeyInfo } from "../api/apiKeyApi";

const PROVIDERS = [
  { id: "google", label: "Google (Gemini) — gratuit" },
  { id: "anthropic", label: "Anthropic (Claude)" },
  { id: "openai", label: "OpenAI (GPT)" },
] as const;

export default function ApiKeySettings() {
  const queryClient = useQueryClient();
  const [inputKey, setInputKey] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: apiKeyApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey: string }) =>
      apiKeyApi.save(provider, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setInputKey({});
      setSavingProvider(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => apiKeyApi.remove(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const configuredProviders = new Set(keys.map((k: ApiKeyInfo) => k.provider));

  return (
    <div className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4">
        Clés API (IA)
      </h2>
      <div className="space-y-4">
        {PROVIDERS.map(({ id, label }) => {
          const isConfigured = configuredProviders.has(id);
          const keyInfo = keys.find((k: ApiKeyInfo) => k.provider === id);

          return (
            <div
              key={id}
              className="p-4 rounded-lg border border-gray-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {label}
                  </p>
                  {isConfigured && keyInfo && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                      Configurée le{" "}
                      {new Date(keyInfo.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {!isConfigured && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      Non configurée
                    </p>
                  )}
                </div>
                {isConfigured && (
                  <button
                    onClick={() => deleteMutation.mutate(id)}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                  >
                    Supprimer
                  </button>
                )}
              </div>

              {savingProvider === id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    type="password"
                    value={inputKey[id] ?? ""}
                    onChange={(e) =>
                      setInputKey((prev) => ({ ...prev, [id]: e.target.value }))
                    }
                    placeholder="sk-..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={() =>
                      saveMutation.mutate({
                        provider: id,
                        apiKey: inputKey[id] ?? "",
                      })
                    }
                    disabled={
                      saveMutation.isPending || !(inputKey[id]?.length)
                    }
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saveMutation.isPending ? "..." : "Sauvegarder"}
                  </button>
                  <button
                    onClick={() => setSavingProvider(null)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSavingProvider(id)}
                  className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isConfigured ? "Remplacer la clé" : "Ajouter une clé"}
                </button>
              )}

              {saveMutation.isError && savingProvider === id && (
                <p className="mt-2 text-xs text-red-500">
                  Erreur : clé invalide ou problème serveur.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
