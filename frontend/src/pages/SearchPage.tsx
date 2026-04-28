import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "../api/searchApi";
import { TreeCard } from "../components/TreeCard";
import { useFavorites } from "../hooks/useFavorites";
import { useAuth } from "../contexts/AuthContext";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { favoriteTrees, handleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();

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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-1">
          Recherche
        </h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">
          Trouvez les arbres qui contiennent une compétence spécifique.
        </p>

        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Docker, Python, Machine Learning..."
            className="flex-1 px-4 py-2.5 rounded-lg text-sm surface-input focus:outline-none focus:ring-2 focus:ring-primary-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>

        {isLoading && debouncedQuery && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
            Recherche en cours...
          </p>
        )}

        {isError && (
          <p className="text-sm text-red-500 text-center py-8">
            Erreur lors de la recherche. Réessayez.
          </p>
        )}

        {!isLoading && !isError && debouncedQuery && results.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
            Aucun résultat pour &quot;{debouncedQuery}&quot;.
          </p>
        )}

        {!debouncedQuery && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
            Tapez un mot-clé pour lancer la recherche.
          </p>
        )}

        {results.length > 0 && (
          <>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
              {total} résultat{total > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((tree) => (
                <TreeCard
                  key={tree.id}
                  id={tree.id}
                  name={tree.name}
                  description={tree.description}
                  creatorUsername={tree.creator_username}
                  tags={tree.tags}
                  variant="compact"
                  score={tree.score}
                  isFavorited={isAuthenticated ? favoriteTrees.includes(tree.id) : undefined}
                  onFavorite={isAuthenticated ? handleFavorite : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
