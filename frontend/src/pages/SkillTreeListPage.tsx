import { useState, useEffect } from "react";
import type { SkillTreeSimple } from "../types/skillTree";
import axiosInst from "../api/client";
import { useNavigate } from "react-router-dom";

function SkillTreeListPage() {
  const [skillTrees, setSkillTrees] = useState<SkillTreeSimple[]>([]);

  const [isModalCreateOpen, setIsModalCreateOpen] = useState(false);

  const [newTreeName, setNewTreeName] = useState("");
  const [newTreeDescription, setNewTreeDescription] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    // Cette fonction s'exécute au montage du composant
    axiosInst
      .get<SkillTreeSimple[]>("/skill-trees/")
      .then((response) => {
        setSkillTrees(response.data);
      })
      .catch((error) => {
        console.error("Erreur:", error);
      });
  }, []);

  const handleCreateTree = (e: React.FormEvent) => {
    e.preventDefault(); // Empêche le rechargement de la page

    axiosInst
      .post("/skill-trees/", {
        name: newTreeName,
        description: newTreeDescription,
      })
      .then((response) => {
        // Ajouter le nouvel arbre à la liste
        setSkillTrees([...skillTrees, response.data]);
        // Fermer le modal
        setIsModalCreateOpen(false);
        // Réinitialiser les champs
        setNewTreeName("");
        setNewTreeDescription("");
      })
      .catch((error) => {
        console.error("Erreur lors de la création:", error);
      });
  };

  const handleTreeDoubleClick = (id: number) => {
    navigate(`/tree/${id}`);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Mes arbres de compétences
          </h1>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-14 h-14 rounded-full text-3xl shadow-lg hover:shadow-xl transition flex items-center justify-center leading-none pb-0.5"
            onClick={() => setIsModalCreateOpen(true)}
          >
            +
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skillTrees.map((tree) => (
            <div
              key={tree.id}
              className="rounded-lg p-6 shadow-md hover:shadow-xl cursor-pointer transition-shadow duration-300 bg-white dark:bg-slate-800"
              onDoubleClick={() => handleTreeDoubleClick(tree.id)}
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
            </div>
          ))}
        </div>
      </div>
      {/* Modal pour créer un nouvel arbre de compétences */}
      {isModalCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form
            className="rounded-lg p-6 w-full max-w-md bg-white dark:bg-slate-800"
            onSubmit={handleCreateTree}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Créer un nouvel arbre de compétences
            </h2>
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
            <div className="flex justify-end">
              <button
                type="button"
                className="font-bold py-2 px-4 rounded mr-2 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-300"
                onClick={() => setIsModalCreateOpen(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default SkillTreeListPage;
