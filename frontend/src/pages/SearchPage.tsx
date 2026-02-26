import { useState } from "react";

function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
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
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
          <button
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
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
