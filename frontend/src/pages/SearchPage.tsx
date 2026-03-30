import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "../api/searchApi";
import type { SearchResult } from "../types/search";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const results = data?.results ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
          Recherche par compétence
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          Trouvez les arbres qui contiennent une compétence spécifique.
        </p>

        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Docker, Python, Machine Learning..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Loading */}
        {isLoading && debouncedQuery && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
            Recherche en cours...
          </p>
        )}

        {/* Error */}
        {isError && (
          <p className="text-sm text-red-500 text-center py-8">
            Erreur lors de la recherche. Réessayez.
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !isError && debouncedQuery && results.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
            Aucun résultat pour "{debouncedQuery}".
          </p>
        )}

        {/* No query */}
        {!debouncedQuery && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
            Tapez un mot-clé pour lancer la recherche.
          </p>
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
              {total} résultat{total > 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {results.map((tree: SearchResult, index: number) => (
                <Link
                  key={tree.id}
                  to={`/tree/${tree.id}`}
                  className="group flex items-stretch rounded-xl overflow-hidden surface-card hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {/* Accent bar */}
                  <div className="w-1 shrink-0 bg-gradient-to-b from-primary-400 to-primary-600 group-hover:w-1.5 transition-all duration-300" />

                  {/* Content */}
                  <div className="flex-1 flex items-center gap-4 px-5 py-4 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-display font-semibold text-gray-800 dark:text-white truncate group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                          {tree.name}
                        </h2>
                        <span className="text-xs text-gray-400 dark:text-slate-600 shrink-0">
                          par {tree.creator_username}
                        </span>
                      </div>
                      {tree.description && (
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400 truncate">
                          {tree.description}
                        </p>
                      )}
                      {tree.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {tree.tags.slice(0, 5).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[11px] rounded bg-primary-100/60 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                            >
                              #{tag}
                            </span>
                          ))}
                          {tree.tags.length > 5 && (
                            <span className="px-1.5 py-0.5 text-[11px] text-gray-400 dark:text-slate-500">
                              +{tree.tags.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Score + arrow */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-300 dark:text-slate-600 font-mono">
                        {Math.round(tree.score * 100)}%
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all duration-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
