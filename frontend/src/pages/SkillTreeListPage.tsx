import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../utils/apiErrors";

import { useFavorites } from "../hooks/useFavorites";

import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import GenerateTreeModal from "../components/GenerateTreeModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { skillTreeApi } from "../api/skillTreeApi";

type Tab = "all" | "trending" | "myTrees" | "myFavoriteTrees";

function SkillTreeListPage() {
  const { favoriteTrees, handleFavorite } = useFavorites();

  const [isModalCreateOpen, setIsModalCreateOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const [newTreeName, setNewTreeName] = useState("");
  const [newTreeDescription, setNewTreeDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [newTreeTags, setNewTreeTags] = useState("");
  const [tagsError, setTagsError] = useState("");

  const { isAuthenticated } = useAuth();

  const { data: skillTrees = [], isLoading } = useQuery({
    queryKey: ["skillTrees", "list", activeTab, isAuthenticated, activeTag],
    queryFn: () => {
      if (activeTab === "trending") return skillTreeApi.getTrendings();
      if (activeTab === "myTrees" && isAuthenticated) return skillTreeApi.getMyTrees();
      if (activeTab === "myFavoriteTrees" && isAuthenticated) return skillTreeApi.getMyFavorites();
      return skillTreeApi.getAll(activeTag || undefined);
    },
  });

  const queryClient = useQueryClient();

  const filteredTrees = useMemo(() => {
    const raw = searchQuery.toLowerCase().trim();
    if (!raw) return skillTrees;
    const isTagSearch = raw.startsWith("#");
    const query = isTagSearch ? raw.slice(1) : raw;
    if (!query) return skillTrees;

    if (isTagSearch) {
      return skillTrees.filter((t) =>
        t.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }
    return skillTrees.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.creator_username.toLowerCase().includes(query) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [skillTrees, searchQuery]);

  const parseTags = (input: string): string[] => {
    return input
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
      .filter((t) => t.length > 0);
  };

  const handleCreateTree = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = newTreeName.trim();
    if (!trimmedName) {
      setNameError("Le nom de l'arbre est requis.");
      return;
    }
    if (trimmedName.length > 100) {
      setNameError("Le nom ne peut pas dépasser 100 caractères.");
      return;
    }
    setNameError("");

    const tags = parseTags(newTreeTags);
    if (tags.length > 10) {
      setTagsError("Maximum 10 tags autorisés.");
      return;
    }
    if (tags.some((t) => t.length > 30)) {
      setTagsError("Chaque tag ne peut pas dépasser 30 caractères.");
      return;
    }
    setTagsError("");

    setIsCreating(true);
    skillTreeApi
      .create(newTreeName, newTreeDescription, tags)
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: ["skillTrees"],
        });
        setIsModalCreateOpen(false);
        setNewTreeName("");
        setNewTreeDescription("");
        setNewTreeTags("");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err));
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  const tabClasses = (tab: Tab) =>
    `px-6 py-4 text-sm font-display font-semibold transition-all duration-200 relative ${
      activeTab === tab
        ? "text-primary-600 dark:text-primary-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400"
        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
    }`;

  return (
    <div className="min-h-screen p-8">
      {/* Search bar */}
      <div className="max-w-xl mx-auto mb-6">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un arbre de compétences..."
            className="w-full py-2.5 pl-10 pr-4 text-sm rounded-xl surface-input text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Tag filter actif */}
      {activeTag && (
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
            #{activeTag}
            <button
              onClick={() => setActiveTag(null)}
              className="ml-1 hover:text-primary-900 dark:hover:text-primary-100"
              aria-label="Retirer le filtre"
            >
              &times;
            </button>
          </span>
        </div>
      )}

      <nav className="mb-8 flex justify-center border-b border-gray-200 dark:border-slate-700">
        <button className={tabClasses("all")} onClick={() => setActiveTab("all")}>
          Tous les arbres
        </button>
        <button className={tabClasses("trending")} onClick={() => setActiveTab("trending")}>
          Tendances
        </button>
        {isAuthenticated && (
          <>
            <button className={tabClasses("myTrees")} onClick={() => setActiveTab("myTrees")}>
              Mes arbres
            </button>
            <button className={tabClasses("myFavoriteTrees")} onClick={() => setActiveTab("myFavoriteTrees")}>
              Mes favoris
            </button>
          </>
        )}
      </nav>

      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-500 dark:text-slate-400">
              Chargement...
            </span>
          </div>
        ) : filteredTrees.length === 0 ? (
          <p className="text-center py-12 text-gray-500 dark:text-slate-400">
            {searchQuery.trim()
              ? "Aucun résultat pour cette recherche."
              : "Aucun arbre de compétences trouvé."}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredTrees.map((tree, index) => (
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
                  {/* Title + description */}
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
                    {tree.tags && tree.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {tree.tags.slice(0, 5).map((tag) => (
                          <button
                            key={tag}
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveTag(tag);
                              setActiveTab("all");
                            }}
                            className="px-1.5 py-0.5 text-[11px] rounded bg-primary-100/60 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/40 transition-colors"
                          >
                            #{tag}
                          </button>
                        ))}
                        {tree.tags.length > 5 && (
                          <span className="px-1.5 py-0.5 text-[11px] text-gray-400 dark:text-slate-500">
                            +{tree.tags.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Favorite + arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      className={`text-3xl transition-all duration-200 hover:scale-125 ${
                        favoriteTrees.includes(tree.id)
                          ? "text-amber-400 hover:text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                          : "text-gray-800/30 dark:text-slate-300/30 hover:text-amber-400 dark:hover:text-amber-400"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleFavorite(tree.id);
                      }}
                      aria-label={
                        favoriteTrees.includes(tree.id)
                          ? "Retirer des favoris"
                          : "Ajouter aux favoris"
                      }
                    >
                      {favoriteTrees.includes(tree.id) ? "\u2605" : "\u2606"}
                    </button>
                    <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {isAuthenticated && (
        <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
          {fabOpen && (
            <div className="flex flex-col gap-2 animate-fade-in-up">
              <button
                onClick={() => { setIsModalCreateOpen(true); setFabOpen(false); }}
                className="px-4 py-2.5 text-sm font-display font-semibold rounded-xl surface-strong text-primary-700 dark:text-primary-300 transition-all duration-200 whitespace-nowrap"
              >
                Créer manuellement
              </button>
              <button
                onClick={() => { setIsAIModalOpen(true); setFabOpen(false); }}
                className="px-4 py-2.5 text-sm font-display font-semibold rounded-xl surface-strong text-primary-700 dark:text-primary-300 transition-all duration-200 whitespace-nowrap flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Générer par IA
              </button>
            </div>
          )}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className={`w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-3xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center leading-none ${fabOpen ? "rotate-45" : ""}`}
          >
            +
          </button>
        </div>
      )}

      {/* Modal IA */}
      {isAIModalOpen && (
        <GenerateTreeModal onClose={() => setIsAIModalOpen(false)} />
      )}
      {/* Modal pour créer un nouvel arbre de compétences */}
      {isModalCreateOpen && (
        <Modal
          title="Créer un nouvel arbre de compétences"
          onClose={() => {
            setIsModalCreateOpen(false);
            setNewTreeName("");
            setNewTreeDescription("");
            setNewTreeTags("");
            setNameError("");
            setTagsError("");
          }}
        >
          <form className="space-y-5" onSubmit={handleCreateTree}>
            <div>
              <label
                className="block text-sm font-display font-semibold mb-1.5 text-gray-700 dark:text-slate-300"
                htmlFor="name"
              >
                Nom
              </label>
              <input
                id="name"
                type="text"
                maxLength={100}
                placeholder="Nom de l'arbre de compétences"
                className={`w-full py-2.5 px-3 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 ${
                  nameError ? "!border-red-500" : ""
                }`}
                value={newTreeName}
                onChange={(e) => {
                  setNewTreeName(e.target.value);
                  if (nameError) setNameError("");
                }}
              />
              {nameError && (
                <p className="mt-1 text-sm text-red-500">{nameError}</p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-display font-semibold mb-1.5 text-gray-700 dark:text-slate-300"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                placeholder="Description de l'arbre de compétences (optionnel)"
                className="w-full py-2.5 px-3 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 resize-none"
                rows={3}
                value={newTreeDescription}
                onChange={(e) => setNewTreeDescription(e.target.value)}
              />
            </div>
            <div>
              <label
                className="block text-sm font-display font-semibold mb-1.5 text-gray-700 dark:text-slate-300"
                htmlFor="tags"
              >
                Tags
              </label>
              <input
                id="tags"
                type="text"
                placeholder="python, web, api (séparés par des virgules, max 10)"
                className={`w-full py-2.5 px-3 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 ${
                  tagsError ? "!border-red-500" : ""
                }`}
                value={newTreeTags}
                onChange={(e) => {
                  setNewTreeTags(e.target.value);
                  if (tagsError) setTagsError("");
                }}
              />
              {tagsError && (
                <p className="mt-1 text-sm text-red-500">{tagsError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsModalCreateOpen(false)}
              >
                Annuler
              </Button>
              <Button variant="primary" type="submit" disabled={isCreating}>
                {isCreating ? "Création..." : "Créer"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default SkillTreeListPage;
