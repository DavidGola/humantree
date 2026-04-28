import { useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../utils/apiErrors";

import { useFavorites } from "../hooks/useFavorites";

import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { TreeCard } from "../components/TreeCard";
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

  const featuredTrees = useMemo(() => skillTrees.slice(0, 3), [skillTrees]);

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

  const popularTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    skillTrees.forEach((t) =>
      t.tags?.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }),
    );
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [skillTrees]);

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

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    setActiveTab("all");
    setSearchQuery("");
  };

  const navTabClass = (tab: Tab) =>
    `relative px-4 py-2.5 text-sm font-display font-medium transition-colors duration-150 ${
      activeTab === tab
        ? "text-primary-700 dark:text-primary-400"
        : "text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
    }`;

  return (
    <div className="min-h-screen">
      <section className="hero-gradient relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-14 text-center">
          <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight text-gray-900 dark:text-white">
            Explorez des arbres<br className="hidden sm:block" /> de{" "}
            <span className="text-primary-500">compétences</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-500 dark:text-slate-400 max-w-xl mx-auto">
            Visualisez vos parcours d'apprentissage comme jamais. Créez, partagez et progressez.
          </p>

          <div className="mt-7 max-w-lg mx-auto">
            <div className="relative group">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 transition-colors group-focus-within:text-primary-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un arbre, un sujet, un tag..."
                className="w-full py-3 pl-12 pr-5 text-sm rounded-xl surface-input focus:outline-none focus:ring-2 focus:ring-primary-600/50 focus:border-primary-500 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-all duration-200"
              />
            </div>

            {activeTag && (
              <div className="mt-3 flex justify-center">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400">
                  #{activeTag}
                  <button
                    onClick={() => setActiveTag(null)}
                    className="ml-1 hover:text-primary-900 dark:hover:text-primary-200"
                    aria-label="Retirer le filtre"
                  >
                    &times;
                  </button>
                </span>
              </div>
            )}

            {popularTags.length > 0 && !activeTag && !searchQuery && (
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 dark:text-slate-500">Populaire :</span>
                {popularTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium border border-primary-200 dark:border-primary-800/60 text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {activeTab === "all" && featuredTrees.length > 0 && !searchQuery && !activeTag && (
        <section className="max-w-6xl mx-auto px-6 pt-10 pb-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              </div>
              <h2 className="font-display font-semibold text-xl text-gray-800 dark:text-white">
                Tendances
              </h2>
            </div>
            <button
              onClick={() => setActiveTab("trending")}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              Voir tout &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredTrees.slice(0, 3).map((tree) => (
              <TreeCard
                key={tree.id}
                id={tree.id}
                name={tree.name}
                description={tree.description}
                creatorUsername={tree.creator_username}
                tags={tree.tags || []}
                variant="featured"
                isFavorited={favoriteTrees.includes(tree.id)}
                onFavorite={handleFavorite}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-6 pt-8 pb-24">
        <nav
          className="flex gap-1 border-b mb-6"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <button
            className={`${navTabClass("all")} after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-sm ${
              activeTab === "all"
                ? "after:bg-primary-700 dark:after:bg-primary-400"
                : ""
            }`}
            onClick={() => setActiveTab("all")}
          >
            Tous
          </button>
          <button
            className={`${navTabClass("trending")} after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-sm ${
              activeTab === "trending"
                ? "after:bg-primary-700 dark:after:bg-primary-400"
                : ""
            }`}
            onClick={() => setActiveTab("trending")}
          >
            Tendances
          </button>
          {isAuthenticated && (
            <>
              <button
                className={`${navTabClass("myTrees")} after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-sm ${
                  activeTab === "myTrees"
                    ? "after:bg-primary-700 dark:after:bg-primary-400"
                    : ""
                }`}
                onClick={() => setActiveTab("myTrees")}
              >
                Mes arbres
              </button>
              <button
                className={`${navTabClass("myFavoriteTrees")} after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-sm ${
                  activeTab === "myFavoriteTrees"
                    ? "after:bg-primary-700 dark:after:bg-primary-400"
                    : ""
                }`}
                onClick={() => setActiveTab("myFavoriteTrees")}
              >
                Favoris
              </button>
            </>
          )}
        </nav>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-400 dark:text-slate-500">
              Chargement...
            </span>
          </div>
        ) : filteredTrees.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">
            {searchQuery.trim()
              ? "Aucun résultat pour cette recherche."
              : "Aucun arbre de compétences trouvé."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTrees.map((tree) => (
              <TreeCard
                key={tree.id}
                id={tree.id}
                name={tree.name}
                description={tree.description}
                creatorUsername={tree.creator_username}
                tags={tree.tags || []}
                variant="compact"
                isFavorited={favoriteTrees.includes(tree.id)}
                onFavorite={handleFavorite}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </section>

      {isAuthenticated && (
        <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-2">
          {fabOpen && (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => {
                  setIsModalCreateOpen(true);
                  setFabOpen(false);
                }}
                className="px-4 py-2 text-sm font-display font-medium rounded-lg surface-strong text-primary-700 dark:text-primary-400 transition-colors duration-150 whitespace-nowrap"
              >
                Créer manuellement
              </button>
              <button
                onClick={() => {
                  setIsAIModalOpen(true);
                  setFabOpen(false);
                }}
                className="px-4 py-2 text-sm font-display font-medium rounded-lg surface-strong text-primary-700 dark:text-primary-400 transition-colors duration-150 whitespace-nowrap flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Générer par IA
              </button>
            </div>
          )}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className={`w-14 h-14 rounded-2xl bg-primary-700 hover:bg-primary-800 text-white text-2xl transition-all duration-200 flex items-center justify-center shadow-lg shadow-primary-700/25 hover:shadow-primary-700/40 hover:scale-105 active:scale-95 ${
              fabOpen ? "rotate-45" : ""
            }`}
          >
            +
          </button>
        </div>
      )}

      {isAIModalOpen && <GenerateTreeModal onClose={() => setIsAIModalOpen(false)} />}
      {isModalCreateOpen && (
        <Modal
          title="Créer un nouvel arbre"
          onClose={() => {
            setIsModalCreateOpen(false);
            setNewTreeName("");
            setNewTreeDescription("");
            setNewTreeTags("");
            setNameError("");
            setTagsError("");
          }}
        >
          <form className="space-y-4" onSubmit={handleCreateTree}>
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
                htmlFor="name"
              >
                Nom
              </label>
              <input
                id="name"
                type="text"
                maxLength={100}
                placeholder="Nom de l'arbre de compétences"
                className={`w-full py-2 px-3 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 ${
                  nameError ? "!border-red-500" : ""
                }`}
                value={newTreeName}
                onChange={(e) => {
                  setNewTreeName(e.target.value);
                  if (nameError) setNameError("");
                }}
              />
              {nameError && <p className="mt-1 text-sm text-red-500">{nameError}</p>}
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                placeholder="Description (optionnel)"
                className="w-full py-2 px-3 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 resize-none"
                rows={3}
                value={newTreeDescription}
                onChange={(e) => setNewTreeDescription(e.target.value)}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
                htmlFor="tags"
              >
                Tags
              </label>
              <input
                id="tags"
                type="text"
                placeholder="python, web, api (séparés par des virgules, max 10)"
                className={`w-full py-2 px-3 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 ${
                  tagsError ? "!border-red-500" : ""
                }`}
                value={newTreeTags}
                onChange={(e) => {
                  setNewTreeTags(e.target.value);
                  if (tagsError) setTagsError("");
                }}
              />
              {tagsError && <p className="mt-1 text-sm text-red-500">{tagsError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsModalCreateOpen(false)}>
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
