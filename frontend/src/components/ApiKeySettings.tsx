import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiKeyApi, type ApiKeyInfo } from "../api/apiKeyApi";
import { Button } from "./Button";

const PROVIDERS = [
  { id: "google", label: "Google (Gemini)", sub: null, icon: "G" },
  { id: "anthropic", label: "Anthropic (Claude)", sub: null, icon: "A" },
  { id: "openai", label: "OpenAI (GPT)", sub: null, icon: "O" },
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
      <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4">
        Clés API (IA)
      </h2>
      <div className="space-y-3">
        {PROVIDERS.map(({ id, label, sub, icon }) => {
          const isConfigured = configuredProviders.has(id);
          const keyInfo = keys.find((k: ApiKeyInfo) => k.provider === id);

          return (
            <div
              key={id}
              className={`rounded-xl border transition-colors duration-200 overflow-hidden ${
                isConfigured
                  ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20"
                  : "surface-card"
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Provider icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm shrink-0 ${
                  isConfigured
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500"
                }`}>
                  {icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-display font-semibold text-gray-800 dark:text-white">
                      {label}
                    </p>
                    {sub && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                        {sub}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isConfigured ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
                    }`} />
                    <p className={`text-xs ${
                      isConfigured
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400 dark:text-slate-500"
                    }`}>
                      {isConfigured && keyInfo
                        ? `Active depuis le ${new Date(keyInfo.created_at).toLocaleDateString("fr-FR")}`
                        : "Non configurée"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isConfigured && savingProvider !== id && (
                    <button
                      onClick={() => deleteMutation.mutate(id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                  {savingProvider !== id && (
                    <button
                      onClick={() => setSavingProvider(id)}
                      className="px-3 py-1.5 text-xs font-display font-semibold rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-primary-200 dark:border-primary-800/50 transition-colors"
                    >
                      {isConfigured ? "Remplacer" : "Configurer"}
                    </button>
                  )}
                </div>
              </div>

              {/* Input row */}
              {savingProvider === id && (
                <div className="px-4 pb-4 flex gap-2">
                  <input
                    type="password"
                    value={inputKey[id] ?? ""}
                    onChange={(e) =>
                      setInputKey((prev) => ({ ...prev, [id]: e.target.value }))
                    }
                    placeholder="sk-..."
                    autoFocus
                    className="flex-1 px-3 py-2 text-sm rounded-lg surface-input text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                  <Button
                    variant="primary"
                    onClick={() =>
                      saveMutation.mutate({
                        provider: id,
                        apiKey: inputKey[id] ?? "",
                      })
                    }
                    disabled={
                      saveMutation.isPending || !(inputKey[id]?.length)
                    }
                  >
                    {saveMutation.isPending ? "..." : "Sauvegarder"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setSavingProvider(null)}
                  >
                    Annuler
                  </Button>
                </div>
              )}

              {saveMutation.isError && savingProvider === id && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-red-500">
                    Erreur : clé invalide ou problème serveur.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
