import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

import { useFavorites } from "../hooks/useFavorites";

import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { skillTreeApi } from "../api/skillTreeApi";

type Tab = "all" | "trending" | "myTrees" | "myFavoriteTrees";

function SkillTreeListPage() {
  const { favoriteTrees, handleFavorite } = useFavorites();

  const [isModalCreateOpen, setIsModalCreateOpen] = useState(false);

  const [newTreeName, setNewTreeName] = useState("");
  const [newTreeDescription, setNewTreeDescription] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("all");

  const { isAuthenticated } = useAuth();

  const { data: skillTrees = [], isLoading } = useQuery({
    queryKey: ["skillTrees", "list", activeTab, isAuthenticated],
    queryFn: () => {
      if (activeTab === "trending") return skillTreeApi.getTrendings();
      if (activeTab === "myTrees" && isAuthenticated) return skillTreeApi.getMyTrees();
      if (activeTab === "myFavoriteTrees" && isAuthenticated) return skillTreeApi.getMyFavorites();
      return skillTreeApi.getAll();
    },
  });

  const queryClient = useQueryClient();

  const handleCreateTree = (e: React.FormEvent) => {
    e.preventDefault(); // Empêche le rechargement de la page

    skillTreeApi
      .create(newTreeName, newTreeDescription)
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: ["skillTrees"],
        });
        // Fermer le modal
        setIsModalCreateOpen(false);
        // Réinitialiser les champs
        setNewTreeName("");
        setNewTreeDescription("");
      })
      .catch(() => {
        toast.error("Erreur lors de la création de l'arbre.");
      });
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-slate-900">
      <nav className="mb-8 flex justify-center border-b border-gray-200 dark:border-slate-700">
        <button
          className={`px-6 py-4 text-base font-medium transition-all duration-200 relative ${
            activeTab === "all"
              ? "text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
          }`}
          onClick={() => setActiveTab("all")}
        >
          Tous les arbres
        </button>
        <button
          className={`px-6 py-4 text-base font-medium transition-all duration-200 relative ${
            activeTab === "trending"
              ? "text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
          }`}
          onClick={() => setActiveTab("trending")}
        >
          Tendances
        </button>
        {isAuthenticated && (
          <>
            <button
              className={`px-6 py-4 text-base font-medium transition-all duration-200 relative ${
                activeTab === "myTrees"
                  ? "text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
              }`}
              onClick={() => setActiveTab("myTrees")}
            >
              Mes arbres
            </button>
            <button
              className={`px-6 py-4 text-base font-medium transition-all duration-200 relative ${
                activeTab === "myFavoriteTrees"
                  ? "text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
              }`}
              onClick={() => setActiveTab("myFavoriteTrees")}
            >
              Mes favoris
            </button>
          </>
        )}
      </nav>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end mb-8">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-14 h-14 rounded-full text-3xl shadow-lg hover:shadow-xl transition flex items-center justify-center leading-none pb-0.5"
            onClick={() => {
              if (isAuthenticated) {
                setIsModalCreateOpen(true);
              } else {
                toast.error(
                  "Vous devez être connecté pour créer un arbre de compétences.",
                );
              }
            }}
          >
            +
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-500 dark:text-slate-400">
              Chargement...
            </span>
          </div>
        ) : skillTrees.length === 0 ? (
          <p className="text-center py-12 text-gray-500 dark:text-slate-400">
            Aucun arbre de compétences trouvé.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skillTrees.map((tree) => (
              <div
                key={tree.id}
                className="relative rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-slate-800"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {tree.name}
                </h2>

                <p className="mt-2 text-gray-600 dark:text-slate-400">
                  {tree.description || "Aucune description"}
                </p>
                <p className="mt-4 text-sm text-gray-500 dark:text-slate-500">
                  Créé par {tree.creator_username} le{" "}
                  {new Date(tree.created_at).toLocaleDateString()}
                </p>
                <button
                  className={`absolute top-4 right-4 text-2xl transition-all duration-200 hover:scale-110 ${
                    favoriteTrees.includes(tree.id)
                      ? "text-yellow-400 hover:text-yellow-500"
                      : "text-gray-400 dark:text-slate-400 hover:text-yellow-400 dark:hover:text-yellow-400"
                  }`}
                  onClick={() => {
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
                <Link
                  to={`/tree/${tree.id}`}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-1 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 group"
                  aria-label="Voir l'arbre"
                >
                  Voir l'arbre
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Modal pour créer un nouvel arbre de compétences */}
      {isModalCreateOpen && (
        <Modal
          title="Créer un nouvel arbre de compétences"
          onClose={() => {
            setIsModalCreateOpen(false);
            setNewTreeName("");
            setNewTreeDescription("");
          }}
        >
          <form className="" onSubmit={handleCreateTree}>
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2 text-gray-700 dark:text-slate-300"
                htmlFor="name"
              >
                Nom
              </label>
              <input
                id="name"
                type="text"
                placeholder="Nom de l'arbre de compétences"
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700"
                value={newTreeName}
                onChange={(e) => setNewTreeName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label
                className="block text-sm font-bold mb-2 text-gray-700 dark:text-slate-300"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                placeholder="Description de l'arbre de compétences (optionnel)"
                className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700"
                value={newTreeDescription}
                onChange={(e) => setNewTreeDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsModalCreateOpen(false)}
              >
                Annuler
              </Button>
              <Button variant="primary" type="submit">
                Créer
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default SkillTreeListPage;
