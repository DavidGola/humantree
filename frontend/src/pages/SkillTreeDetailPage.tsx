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
        style={{ background: "#40916c", width: 8, height: 8, border: "none" }}
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
              borderRadius: 4,
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
        style={{ background: "#40916c", width: 8, height: 8, border: "none" }}
      />
    </>
  );
}

const nodeTypes = {
  checkSkill: CheckSkillNode,
  noCheckSkill: NoCheckSkillNode,
  linkedTreeNode: LinkedTreeNode,
};

function CheckSkillNode({ data }: { data: CheckSkillNodeData }) {
  const isChecked =
    data.userDetailSkill?.skill_ids.includes(data.skillId) || false;
  const isRoot = data.isRoot || false;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#40916c", width: 8, height: 8, border: "none" }}
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
              borderRadius: 5,
              border: isChecked
                ? "2px solid #22c55e"
                : isRoot
                  ? "2px solid rgba(255, 255, 255, 0.4)"
                  : "2px solid #86efac",
              backgroundColor: isChecked ? "#22c55e" : "transparent",
              transition: "all 200ms ease",
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
        style={{ background: "#40916c", width: 8, height: 8, border: "none" }}
      />
    </>
  );
}

function NoCheckSkillNode({ data }: { data: NoCheckSkillNodeData }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#40916c", width: 8, height: 8, border: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, lineHeight: 1.4 }}>{data.label}</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#40916c", width: 8, height: 8, border: "none" }}
      />
    </>
  );
}

function SkillTreeDetailPage() {
  const { loading, tree, selection, editing, skills, edges, deleteTree, unsavedGuard, linkedTrees } = useSkillTreeDetail();
  const { favoriteTrees, handleFavorite } = useFavorites();

  if (loading.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400 dark:text-slate-500">
          Chargement...
        </span>
      </div>
    );
  }

  if (loading.isError || !tree.skillTree) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 dark:text-red-400">
          Erreur lors du chargement de l'arbre.
        </p>
      </div>
    );
  }

  const skillTree = tree.skillTree;
  const hasBreadcrumb = linkedTrees.breadcrumb.length > 0;

  const totalSkills = skillTree.skills.filter(s => !s.linked_tree_id).length;
  const checkNode = tree.graphData.nodes.find(n => n.type === "checkSkill");
  const checkedIds: number[] = checkNode ? ((checkNode.data as unknown as CheckSkillNodeData)?.userDetailSkill?.skill_ids ?? []) : [];
  const checkedSkills = skillTree.skills.filter(s =>
    !s.linked_tree_id && checkedIds.includes(s.id)
  ).length;

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
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
                  className="text-xl font-display font-bold px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 flex-1 surface-input text-gray-900 dark:text-white"
                />
                <Button variant="primary" type="submit">
                  OK
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h1
                  className={`text-xl font-display font-bold text-gray-900 dark:text-white ${editing.isEditing && tree.isAuthorizedToEdit() ? "cursor-pointer hover:text-primary-700 dark:hover:text-primary-400 transition-colors" : ""}`}
                  onClick={() => {
                    if (editing.isEditing && tree.isAuthorizedToEdit()) editing.setIsEditingTitle(true);
                  }}
                >
                  {skillTree.name}
                </h1>
                {!editing.isEditing && (
                  <button
                    className={`text-lg transition-colors duration-150 ${
                      favoriteTrees.includes(skillTree.id)
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-gray-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-500"
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

            {editing.isEditingDesc && tree.isAuthorizedToEdit() ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  editing.setIsEditingDesc(false);
                }}
                className="flex items-start gap-3 mb-2"
              >
                <textarea
                  value={skillTree.description || ""}
                  onChange={(e) =>
                    tree.setSkillTree({
                      ...skillTree,
                      description: e.target.value,
                    })
                  }
                  className="text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 flex-1 resize-none surface-input text-gray-600 dark:text-slate-300"
                  rows={2}
                />
                <Button variant="primary" type="submit">
                  OK
                </Button>
              </form>
            ) : (
              <>
                <p
                  className={`text-sm text-gray-500 dark:text-slate-400 mb-2 ${editing.isEditing && tree.isAuthorizedToEdit() ? "cursor-pointer hover:text-primary-700 dark:hover:text-primary-400 transition-colors" : ""}`}
                  onClick={() => {
                    if (editing.isEditing && tree.isAuthorizedToEdit()) editing.setIsEditingDesc(true);
                  }}
                >
                  {skillTree.description || "Aucune description"}
                </p>

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
                      placeholder="python, web, api (max 10)"
                      className="text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 flex-1 surface-input text-gray-600 dark:text-slate-300"
                    />
                    <Button variant="primary" type="submit">
                      OK
                    </Button>
                  </form>
                ) : (
                  <div
                    className={`flex flex-wrap gap-1 mb-2 ${editing.isEditing && tree.isAuthorizedToEdit() ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (editing.isEditing && tree.isAuthorizedToEdit()) editing.startEditingTags();
                    }}
                  >
                    {skillTree.tags && skillTree.tags.length > 0 ? (
                      skillTree.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs rounded border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400"
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
          <div className="text-right shrink-0 ml-4">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {skillTree.creator_username} · {new Date(skillTree.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {totalSkills > 0 && (
          <div className="mt-2 mb-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-primary-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${Math.round((checkedSkills / totalSkills) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 whitespace-nowrap">
                {checkedSkills}/{totalSkills}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {tree.isAuthorizedToEdit() && (
              <Button
                onClick={editing.handleEditButton}
                variant={editing.isEditing ? "secondary" : "primary"}
              >
                {editing.isEditing ? "Terminer" : "Éditer"}
              </Button>
            )}

            {editing.isEditing && tree.isAuthorizedToEdit() && (
              <>
                <Button variant="primary" onClick={() => skills.setCreateSkillModalOpen(true)}>
                  + Compétence
                </Button>
                <Button variant="primary" onClick={() => linkedTrees.setCreateSubTreeModalOpen(true)}>
                  + Sous-arbre
                </Button>
                <Button variant="primary" onClick={() => linkedTrees.setLinkTreeModalOpen(true)}>
                  Lier un arbre
                </Button>
                <Button variant="success" onClick={editing.handleSaveToBackend} disabled={editing.isSaving}>
                  {editing.isSaving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
                {editing.isSkillTreeModified && (
                  <span className="text-xs text-accent-500 font-medium">
                    Modifications non sauvegardées
                  </span>
                )}
                <Button variant="danger" onClick={() => deleteTree.setIsModalDeleteOpen(true)}>
                  Supprimer
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {hasBreadcrumb && (
        <div className="px-6 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-1 text-sm">
            {linkedTrees.breadcrumb.map((item, index) => (
              <span key={item.id} className="flex items-center gap-1">
                {index > 0 && <span className="text-gray-400 dark:text-slate-500">/</span>}
                <button
                  onClick={() => linkedTrees.navigateBack(index)}
                  className="text-primary-700 dark:text-primary-400 hover:underline"
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

      <div className="flex-1 relative">
        <div
          className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #40916c 0.8px, transparent 0.8px)",
            backgroundSize: "20px 20px",
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
            style: { stroke: "#86efac", strokeWidth: 2 },
          }}
        />
      </div>

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

      {skills.createSkillModalOpen && (
        <Modal
          onClose={() => {
            skills.setCreateSkillModalOpen(false);
            skills.setNewSkillName("");
            skills.setNewSkillDescription("");
          }}
          title="Créer une compétence"
        >
          <form onSubmit={skills.handleCreateSkill} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Nom
              </label>
              <input
                type="text"
                value={skills.newSkillName}
                onChange={(e) => skills.setNewSkillName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={skills.newSkillDescription}
                onChange={(e) => skills.setNewSkillDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
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

      {linkedTrees.createSubTreeModalOpen && (
        <Modal
          onClose={() => {
            linkedTrees.setCreateSubTreeModalOpen(false);
            linkedTrees.setNewSubTreeName("");
            linkedTrees.setNewSubTreeDescription("");
          }}
          title="Créer un sous-arbre"
        >
          <form onSubmit={linkedTrees.handleCreateSubTree} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Nom du sous-arbre
              </label>
              <input
                type="text"
                value={linkedTrees.newSubTreeName}
                onChange={(e) => linkedTrees.setNewSubTreeName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={linkedTrees.newSubTreeDescription}
                onChange={(e) => linkedTrees.setNewSubTreeDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg surface-input focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
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
              Abandonner
            </Button>
          </div>
        </Modal>
      )}

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
