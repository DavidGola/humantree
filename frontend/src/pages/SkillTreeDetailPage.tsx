import { useState } from "react";
import type { Skill } from "../types/skillTree";
import type { UserDetailSkill } from "../types/user";
import { ReactFlow, Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFavorites } from "../hooks/useFavorites";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { SkillDetailModal } from "../components/SkillDetailModal";
import { LinkTreeModal } from "../components/LinkTreeModal";
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

interface LinkedTreeNodeData {
  label: string;
  linkedTreeId: number;
  linkedTreeChecked?: number;
  linkedTreeTotal?: number;
  isEditing?: boolean;
}

/* Custom node: linked sub-tree with tree icon */
function LinkedTreeNode({ data }: { data: LinkedTreeNodeData }) {
  const showCounter =
    !data.isEditing &&
    data.linkedTreeTotal !== undefined &&
    data.linkedTreeTotal > 0;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#a78bfa", width: 8, height: 8, border: "none" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 10H3" />
          <path d="M21 6H3" />
          <path d="M21 14H3" />
          <path d="M17 18H3" />
        </svg>
        <span style={{ flex: 1, lineHeight: 1.4 }}>{data.label}</span>
        {showCounter && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              opacity: 0.85,
              whiteSpace: "nowrap",
              padding: "1px 6px",
              borderRadius: 6,
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            {data.linkedTreeChecked}/{data.linkedTreeTotal}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#a78bfa", width: 8, height: 8, border: "none" }}
      />
    </>
  );
}

const nodeTypes = {
  checkSkill: CheckSkillNode,
  noCheckSkill: NoCheckSkillNode,
  linkedTreeNode: LinkedTreeNode,
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
        style={{ background: "#a78bfa", width: 8, height: 8, border: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, lineHeight: 1.4 }}>{data.label}</span>

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
                  : "2px solid #c4b5fd",
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
        style={{ background: "#a78bfa", width: 8, height: 8, border: "none" }}
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
        style={{ background: "#a78bfa", width: 8, height: 8, border: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, lineHeight: 1.4 }}>{data.label}</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#a78bfa", width: 8, height: 8, border: "none" }}
      />
    </>
  );
}

function SkillTreeDetailPage() {
  const { loading, tree, selection, editing, skills, edges, deleteTree, unsavedGuard, linkedTrees } = useSkillTreeDetail();
  const { favoriteTrees, handleFavorite } = useFavorites();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  if (loading.isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-slate-500 dark:text-slate-400">
          Chargement...
        </span>
      </div>
    );
  }

  if (loading.isError || !tree.skillTree) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <p className="text-lg text-red-500 dark:text-red-400">
          Erreur lors du chargement de l'arbre de compétences.
        </p>
      </div>
    );
  }

  const skillTree = tree.skillTree;
  const hasBreadcrumb = linkedTrees.breadcrumb.length > 0;

  // Progress bar data
  const totalSkills = skillTree.skills.filter(s => !s.linked_tree_id).length;
  const checkNode = tree.graphData.nodes.find(n => n.type === "checkSkill");
  const checkedIds: number[] = checkNode ? ((checkNode.data as unknown as CheckSkillNodeData)?.userDetailSkill?.skill_ids ?? []) : [];
  const checkedSkills = skillTree.skills.filter(s =>
    !s.linked_tree_id && checkedIds.includes(s.id)
  ).length;

  return (
    <div className="flex flex-col h-screen bg-transparent">
      {/* Header */}
      <div className="px-6 py-4 backdrop-blur-md border-b" style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
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
                  className="text-2xl font-display font-bold px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 surface-input text-gray-900 dark:text-white"
                />
                <Button variant="primary" type="submit">
                  OK
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-3 mb-1">
                <h1
                  className={`text-2xl font-display font-bold text-gray-900 dark:text-white ${editing.isEditing && tree.isAuthorizedToEdit() ? "cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors" : ""}`}
                  onClick={() => {
                    if (editing.isEditing && tree.isAuthorizedToEdit()) editing.setIsEditingTitle(true);
                  }}
                >
                  {skillTree.name}
                </h1>
                {!editing.isEditing && (
                  <button
                    className={`text-2xl transition-all duration-200 hover:scale-110 ${
                      favoriteTrees.includes(skillTree.id)
                        ? "text-accent-500 hover:text-accent-600"
                        : "text-gray-400 dark:text-slate-400 hover:text-accent-500 dark:hover:text-accent-500"
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
              </div>
            )}

            {/* Description - click to edit */}
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
                  className="text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 resize-none surface-input text-gray-600 dark:text-slate-300"
                  rows={2}
                />
                <Button variant="primary" type="submit">
                  OK
                </Button>
              </form>
            ) : (
              <>
                <p
                  className={`text-sm text-gray-500 dark:text-slate-400 mb-3 ${editing.isEditing && tree.isAuthorizedToEdit() ? "cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors" : ""}`}
                  onClick={() => {
                    if (editing.isEditing && tree.isAuthorizedToEdit()) editing.setIsEditingDesc(true);
                  }}
                >
                  {skillTree.description || "Aucune description"}
                </p>

                {/* Tags - click to edit */}
                {editing.isEditingTags && tree.isAuthorizedToEdit() ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      editing.submitTagsEdit();
                    }}
                    className="flex items-center gap-2 mb-2"
                  >
                    <input
                      type="text"
                      value={editing.tagsInput}
                      onChange={(e) => editing.setTagsInput(e.target.value)}
                      placeholder="python, web, api (max 10, séparés par des virgules)"
                      className="text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 surface-input text-gray-600 dark:text-slate-300"
                    />
                    <Button variant="primary" type="submit">
                      OK
                    </Button>
                  </form>
                ) : (
                  <div
                    className={`flex flex-wrap gap-1.5 mb-2 ${editing.isEditing && tree.isAuthorizedToEdit() ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (editing.isEditing && tree.isAuthorizedToEdit()) editing.startEditingTags();
                    }}
                  >
                    {skillTree.tags && skillTree.tags.length > 0 ? (
                      skillTree.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {editing.isEditing ? "Cliquer pour ajouter des tags" : "Aucun tag"}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {/* Creation info */}
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Créé par {skillTree.creator_username}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              le {new Date(skillTree.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {totalSkills > 0 && (
          <div className="mt-2 mb-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-primary-200/50 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.round((checkedSkills / totalSkills) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-display font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap">
                {checkedSkills}/{totalSkills}
              </span>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {tree.isAuthorizedToEdit() && (
              <button
                onClick={editing.handleEditButton}
                className={`px-3 py-1.5 text-sm font-display font-semibold rounded-lg transition-colors duration-200 ${
                  editing.isEditing
                    ? "text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
                    : "text-primary-700 dark:text-primary-300 bg-primary-200/40 dark:bg-primary-900/20 hover:bg-primary-200/60 dark:hover:bg-primary-900/40"
                }`}
              >
                {editing.isEditing ? "Terminer" : "Éditer"}
              </button>
            )}

            {editing.isEditing && tree.isAuthorizedToEdit() && (
              <>
                <button
                  onClick={() => skills.setCreateSkillModalOpen(true)}
                  className="px-3 py-1.5 text-sm font-display font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200"
                >
                  + Compétence
                </button>
                <button
                  onClick={() => linkedTrees.setCreateSubTreeModalOpen(true)}
                  className="px-3 py-1.5 text-sm font-display font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200"
                >
                  + Sous-arbre
                </button>
                <button
                  onClick={() => linkedTrees.setLinkTreeModalOpen(true)}
                  className="px-3 py-1.5 text-sm font-display font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200"
                >
                  Lier un arbre
                </button>
                <Button variant="success" onClick={editing.handleSaveToBackend} disabled={editing.isSaving}>
                  {editing.isSaving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
                {editing.isSkillTreeModified && (
                  <span className="text-xs text-accent-500 font-medium">
                    Modifications non sauvegardées
                  </span>
                )}
                {/* More menu for danger actions */}
                <div className="relative">
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className="px-2 py-1.5 text-sm rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    ...
                  </button>
                  {moreMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 w-44 rounded-lg surface-strong backdrop-blur-md py-1 z-50">
                      <button
                        onClick={() => { deleteTree.setIsModalDeleteOpen(true); setMoreMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Supprimer l'arbre
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      {hasBreadcrumb && (
        <div className="px-6 py-2 bg-primary-50/50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-1 text-sm">
            {linkedTrees.breadcrumb.map((item, index) => (
              <span key={item.id} className="flex items-center gap-1">
                {index > 0 && <span className="text-gray-400 dark:text-slate-500">/</span>}
                <button
                  onClick={() => linkedTrees.navigateBack(index)}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {item.name}
                </button>
              </span>
            ))}
            <span className="text-gray-400 dark:text-slate-500">/</span>
            <span className="text-gray-700 dark:text-slate-300 font-medium">
              {skillTree.name}
            </span>
          </div>
        </div>
      )}

      {/* React Flow zone with dot pattern background */}
      <div className="flex-1 relative">
        <div
          className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #c4b5fd 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
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
            if (!skill) return;
            if (skill.linked_tree_id) {
              linkedTrees.navigateToLinkedTree(skill.linked_tree_id);
            } else {
              selection.setSelectedSkill(skill);
            }
          }}
          nodes={tree.graphData.nodes}
          edges={tree.graphData.edges}
          isValidConnection={editing.isValidConnection}
          colorMode={tree.isDarkMode ? "dark" : "light"}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            style: { stroke: "#ddd6fe", strokeWidth: 2 },
          }}
        />
      </div>

      {/* Modal : ouverture d'une compétence */}
      {selection.selectedSkill && (
        <SkillDetailModal
          skill={selection.selectedSkill}
          isEditing={editing.isEditing}
          treeName={skillTree.name}
          treeDescription={skillTree.description || undefined}
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
          <form onSubmit={skills.handleCreateSkill} className="space-y-5">
            <div>
              <label className="block text-sm font-display font-semibold mb-1.5 text-gray-700 dark:text-slate-300">
                Nom
              </label>
              <input
                type="text"
                value={skills.newSkillName}
                onChange={(e) => skills.setNewSkillName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-display font-semibold mb-1.5 text-gray-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={skills.newSkillDescription}
                onChange={(e) => skills.setNewSkillDescription(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => skills.setCreateSkillModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="success" type="submit">
                Créer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal : créer un sous-arbre */}
      {linkedTrees.createSubTreeModalOpen && (
        <Modal
          onClose={() => {
            linkedTrees.setCreateSubTreeModalOpen(false);
            linkedTrees.setNewSubTreeName("");
            linkedTrees.setNewSubTreeDescription("");
          }}
          title="Créer un sous-arbre"
        >
          <form onSubmit={linkedTrees.handleCreateSubTree} className="space-y-5">
            <div>
              <label className="block text-sm font-display font-semibold mb-1.5 text-gray-700 dark:text-slate-300">
                Nom du sous-arbre
              </label>
              <input
                type="text"
                value={linkedTrees.newSubTreeName}
                onChange={(e) => linkedTrees.setNewSubTreeName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-display font-semibold mb-1.5 text-gray-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={linkedTrees.newSubTreeDescription}
                onChange={(e) => linkedTrees.setNewSubTreeDescription(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => linkedTrees.setCreateSubTreeModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="success" type="submit">
                Créer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal : lier un arbre */}
      {linkedTrees.linkTreeModalOpen && (
        <LinkTreeModal
          onSelect={linkedTrees.handleLinkTree}
          onClose={() => linkedTrees.setLinkTreeModalOpen(false)}
          excludeTreeIds={[
            skillTree.id,
            ...linkedTrees.breadcrumb.map((entry) => entry.id),
          ]}
        />
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
            <Button variant="danger" onClick={deleteTree.handleDeleteTree} disabled={deleteTree.isDeleting}>
              {deleteTree.isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal : confirmer sortie du mode édition */}
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

      {/* Modal : bloquer la navigation */}
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
