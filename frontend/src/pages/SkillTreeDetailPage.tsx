import type { Skill } from "../types/skillTree";
import type { UserDetailSkill } from "../types/user";
import { useNavigate } from "react-router-dom";
import { ReactFlow, Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFavorites } from "../hooks/useFavorites";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { SkillDetailModal } from "../components/SkillDetailModal";
import { useSkillTreeDetail } from "../hooks/useSkillTreeDetail";

interface CheckSkillNodeData {
  label: string;
  skillId: number;
  isRoot: boolean;
  userDetailSkill: UserDetailSkill | null;
  handleCheckSkill: (skillId: number, isChecked: boolean) => void;
}

interface NoCheckSkillNodeData {
  label: string;
}

const nodeTypes = {
  checkSkill: CheckSkillNode,
  noCheckSkill: NoCheckSkillNode,
};

/* Custom node: skill name + styled checkbox + React Flow handles */
function CheckSkillNode({ data }: { data: CheckSkillNodeData }) {
  const isChecked =
    data.userDetailSkill?.skill_ids.includes(data.skillId) || false;
  const isRoot = data.isRoot || false;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#94a3b8", width: 8, height: 8, border: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Skill name */}
        <span style={{ flex: 1, lineHeight: 1.4 }}>{data.label}</span>

        {/* Custom checkbox */}
        <label
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) =>
              data.handleCheckSkill(data.skillId, e.target.checked)
            }
            style={{
              position: "absolute",
              opacity: 0,
              width: 0,
              height: 0,
            }}
          />
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 6,
              border: isChecked
                ? "2px solid #22c55e"
                : isRoot
                  ? "2px solid rgba(255, 255, 255, 0.5)"
                  : "2px solid #94a3b8",
              backgroundColor: isChecked ? "#22c55e" : "transparent",
              transition: "all 250ms ease",
            }}
          >
            {isChecked && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        </label>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#94a3b8", width: 8, height: 8, border: "none" }}
      />
    </>
  );
}

/* Custom node: skill name only + React Flow handles */
function NoCheckSkillNode({ data }: { data: NoCheckSkillNodeData }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#94a3b8", width: 8, height: 8, border: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Skill name */}
        <span style={{ flex: 1, lineHeight: 1.4 }}>{data.label}</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#94a3b8", width: 8, height: 8, border: "none" }}
      />
    </>
  );
}

function SkillTreeDetailPage() {
  const navigate = useNavigate();
  const { loading, tree, selection, editing, skills, edges, deleteTree, unsavedGuard } = useSkillTreeDetail();
  const { favoriteTrees, handleFavorite } = useFavorites();

  if (loading.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-lg text-slate-500 dark:text-slate-400">
          Chargement...
        </p>
      </div>
    );
  }

  if (loading.isError || !tree.skillTree) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-lg text-red-500 dark:text-red-400">
          Erreur lors du chargement de l'arbre de compétences.
        </p>
      </div>
    );
  }

  const skillTree = tree.skillTree;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header : titre + description + actions */}
      <div className="px-6 py-4 border-b shadow-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        {/* Titre */}
        <div className="flex items-center justify-between">
          <div>
            {editing.isEditingTitle && tree.isAuthorizedToEdit() ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  editing.setIsEditingTitle(false);
                }}
                className="flex items-center gap-3 mb-2"
              >
                <input
                  type="text"
                  value={skillTree.name}
                  onChange={(e) =>
                    tree.setSkillTree({
                      ...skillTree,
                      name: e.target.value,
                    })
                  }
                  className="text-2xl font-bold px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 border text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
                <Button variant="primary" type="submit">
                  OK
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {skillTree.name}
                </h1>
                {!editing.isEditing && (
                  <button
                    className={`text-2xl transition-all duration-200 hover:scale-110 ${
                      favoriteTrees.includes(skillTree.id)
                        ? "text-yellow-400 hover:text-yellow-500"
                        : "text-gray-400 dark:text-slate-400 hover:text-yellow-400 dark:hover:text-yellow-400"
                    }`}
                    onClick={() => handleFavorite(skillTree.id)}
                    aria-label={
                      favoriteTrees.includes(skillTree.id)
                        ? "Retirer des favoris"
                        : "Ajouter aux favoris"
                    }
                  >
                    {favoriteTrees.includes(skillTree.id)
                      ? "\u2605"
                      : "\u2606"}
                  </button>
                )}
                {editing.isEditing && tree.isAuthorizedToEdit() && (
                  <button
                    onClick={() => editing.setIsEditingTitle(true)}
                    className="text-sm transition-colors duration-200 text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
                  >
                    Modifier
                  </button>
                )}
              </div>
            )}

            {/* Description */}
            {editing.isEditingDesc && tree.isAuthorizedToEdit() ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  editing.setIsEditingDesc(false);
                }}
                className="flex items-start gap-3 mb-3"
              >
                <textarea
                  value={skillTree.description || ""}
                  onChange={(e) =>
                    tree.setSkillTree({
                      ...skillTree,
                      description: e.target.value,
                    })
                  }
                  className="text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 resize-none border text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  rows={2}
                />

                <Button variant="primary" type="submit">
                  OK
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {skillTree.description || "Aucune description"}
                </p>

                {editing.isEditing && tree.isAuthorizedToEdit() && (
                  <button
                    onClick={() => editing.setIsEditingDesc(true)}
                    className="text-sm transition-colors duration-200 text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
                  >
                    Modifier
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Infos création à droite de l'écran */}
          <div className="top-4 right-6 text-right">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Créé par {skillTree.creator_username}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              le {new Date(skillTree.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {/* Barre d'actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Retour
            </button>
            {tree.isAuthorizedToEdit() && (
              <button
                onClick={editing.handleEditButton}
                className="px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                {editing.isEditing ? "Terminer" : "Éditer"}
              </button>
            )}

            {editing.isEditing && tree.isAuthorizedToEdit() && (
              <div>
                <button
                  onClick={() => skills.setCreateSkillModalOpen(true)}
                  className="px-3 py-1.5 text-sm text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors duration-200"
                >
                  + Ajouter une compétence
                </button>
                <Button variant="primary" onClick={editing.handleSaveToBackend}>
                  Sauvegarder
                </Button>
                <button
                  onClick={() => deleteTree.setIsModalDeleteOpen(true)}
                  className="px-3 py-1.5 text-sm hover:text-white hover:bg-red-500 border rounded-lg transition-colors duration-200 text-red-500 dark:text-red-400 border-red-300 dark:border-red-500/30"
                >
                  Supprimer l'arbre
                </button>
                {editing.isSkillTreeModified && (
                  <span className="ml-2 text-xs text-yellow-500">
                    Modifications non sauvegardées
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone React Flow — prend toute la place restante */}
      <div className="flex-1">
        <ReactFlow
          nodesDraggable={false}
          nodesConnectable={editing.isEditing}
          nodeTypes={nodeTypes}
          onConnect={edges.handleEdgeCreate}
          onReconnect={edges.handleEdgeReconnect}
          onEdgeClick={(event, edge) => {
            event.preventDefault();
            if (!editing.isEditing) return;
            selection.setSelectedEdge(edge);
          }}
          zoomOnScroll={true}
          zoomOnDoubleClick={false}
          onNodeDoubleClick={(event, node) => {
            event.preventDefault();
            const skill: Skill | undefined = skillTree.skills.find(
              (s) => s.id === parseInt(node.id, 10),
            );
            selection.setSelectedSkill(skill || null);
          }}
          nodes={tree.graphData.nodes}
          edges={tree.graphData.edges}
          isValidConnection={editing.isValidConnection}
          colorMode={tree.isDarkMode ? "dark" : "light"}
          fitView
          proOptions={{ hideAttribution: true }}
        />
      </div>

      {/* Modal : ouverture d'une compétence */}
      {selection.selectedSkill && (
        <SkillDetailModal
          skill={selection.selectedSkill}
          isEditing={editing.isEditing}
          onClose={() => selection.setSelectedSkill(null)}
          onSave={skills.handleSkillUpdate}
          onDelete={skills.handleDeleteSkill}
        />
      )}

      {/* Modal : créer une compétence */}
      {skills.createSkillModalOpen && (
        <Modal
          onClose={() => {
            skills.setCreateSkillModalOpen(false);
            skills.setNewSkillName("");
            skills.setNewSkillDescription("");
          }}
          title="Créer une nouvelle compétence"
        >
          <form onSubmit={skills.handleCreateSkill}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Nom
              </label>
              <input
                type="text"
                value={skills.newSkillName}
                onChange={(e) => skills.setNewSkillName(e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={skills.newSkillDescription}
                onChange={(e) =>
                  skills.setNewSkillDescription(e.target.value)
                }
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => skills.setCreateSkillModalOpen(false)}
              >
                Annuler
              </Button>
              <Button variant="success" type="submit">
                Créer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal : confirmer suppression de l'arbre */}
      {deleteTree.isModalDeleteOpen && (
        <Modal
          onClose={() => deleteTree.setIsModalDeleteOpen(false)}
          title="Confirmer la suppression"
        >
          <p className="text-sm mb-6 text-gray-500 dark:text-slate-400">
            L'arbre "{skillTree.name}" et toutes ses compétences seront
            définitivement supprimés. Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => deleteTree.setIsModalDeleteOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="danger" onClick={deleteTree.handleDeleteTree}>
              Supprimer
            </Button>
          </div>
        </Modal>
      )}
      {/* Modal : confirmer sortie du mode édition (bouton "Terminer") */}
      {unsavedGuard.showExitEditModal && (
        <Modal
          onClose={() => unsavedGuard.setShowExitEditModal(false)}
          title="Modifications non sauvegardées"
        >
          <p className="text-sm mb-6 text-gray-500 dark:text-slate-400">
            Vous avez des modifications non sauvegardées. Que souhaitez-vous
            faire ?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => unsavedGuard.setShowExitEditModal(false)}
            >
              Continuer l'édition
            </Button>
            <Button variant="danger" onClick={unsavedGuard.discardChanges}>
              Abandonner les modifications
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal : bloquer la navigation (liens, retour, déconnexion) */}
      {unsavedGuard.blocker.state === "blocked" && (
        <Modal
          onClose={() => unsavedGuard.blocker.reset?.()}
          title="Modifications non sauvegardées"
        >
          <p className="text-sm mb-6 text-gray-500 dark:text-slate-400">
            Vous avez des modifications non sauvegardées. Si vous quittez cette
            page, vos changements seront perdus.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => unsavedGuard.blocker.reset?.()}
            >
              Rester sur la page
            </Button>
            <Button
              variant="danger"
              onClick={() => unsavedGuard.blocker.proceed?.()}
            >
              Quitter sans sauvegarder
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SkillTreeDetailPage;
