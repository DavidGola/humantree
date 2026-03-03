import { useState } from "react";

function SearchPage() {
  const [query, setQuery] = useState("");

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
          <button
            className="px-5 py-2.5 text-sm font-display font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors duration-200"
          >
            Rechercher
          </button>
        </div>

        <p className="text-sm text-gray-400 dark:text-slate-500 text-center">
          Bientôt disponible.
        </p>
      </div>
    </div>
  );
}

export default SearchPage;
