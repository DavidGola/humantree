import React, { useEffect, useState, useMemo, useCallback } from "react";
import type { SkillTreeDetail, Skill } from "../types/skillTree";
import { useParams, useNavigate } from "react-router-dom";
import axiosInst from "../api/client";
import { getOutgoers, ReactFlow, Handle, Position } from "@xyflow/react";
import type { Node, Edge, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "dagre";
import { useKeyPress } from "@xyflow/react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";
import type { UserDetailSkill } from "../types/user";
import { useFavorites } from "../hooks/useFavorites";

const nodeTypes = {
  checkSkill: CheckSkillNode,
  noCheckSkill: NoCheckSkillNode,
};

function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new Dagre.graphlib.Graph();

  // 1. Configurer le graphe
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 120, ranksep: 160 });

  // 2. Donner les noeuds et arêtes à dagre
  nodes.forEach((node) => g.setNode(node.id, { width: 220, height: 72 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  // 3. Calculer le layout
  Dagre.layout(g);

  // Après ça, g.node(id) retourne un objet avec .x et .y
  // À toi de compléter : parcours tes nodes et remplace leur position !
  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
    };
  });
}

function returnNewIdSkillNegative(skillTree: SkillTreeDetail): number {
  const minId = Math.min(...skillTree.skills.map((s) => s.id));
  return minId > 0 ? -1 : minId - 1; // Si tous les IDs sont positifs, commence à -1
}

function transformSkillstoGraph(
  skillTree: SkillTreeDetail,
  isDarkMode: boolean,
  isEditing: boolean,
  userDetailSkill: UserDetailSkill | null,
  handleCheckSkill: (skillId: number, isChecked: boolean) => void,
) {
  const nodes = skillTree.skills.map((skill) => ({
    id: String(skill.id),
    data: {
      label: skill.name,
      skillId: skill.id,
      isRoot: skill.is_root,
      userDetailSkill,
      handleCheckSkill,
    },
    type: isEditing ? "noCheckSkill" : "checkSkill",
    position: { x: 0, y: 0 }, // Position par défaut, à ajuster avec un algorithme de layout
    style: {
      background: skill.is_root
        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
        : isDarkMode
          ? "#1e293b"
          : "#ffffff",
      color: skill.is_root ? "#ffffff" : isDarkMode ? "#e2e8f0" : "#1f2937",
      border: skill.is_root
        ? "2px solid rgba(255, 255, 255, 0.2)"
        : isDarkMode
          ? "1px solid #475569"
          : "1px solid #d1d5db",
      borderRadius: "12px",
      padding: "12px 24px",
      fontSize: "15px",
      fontWeight: skill.is_root ? 600 : 400,
      boxShadow: skill.is_root ? "0 4px 16px rgba(99, 102, 241, 0.35)" : "none",
    },
  }));

  const edges = skillTree.skills.flatMap((skill) =>
    skill.unlock_ids.map((unlockId) => ({
      id: `e${skill.id}-${unlockId}`,
      source: String(skill.id),
      target: String(unlockId),
    })),
  );
  const laidOutNodes = layoutGraph(nodes, edges);
  return { nodes: laidOutNodes, edges };
}

/* Custom node: skill name + styled checkbox + React Flow handles */
function CheckSkillNode(props: any) {
  const isChecked =
    props.data.userDetailSkill?.skill_ids.includes(props.data.skillId) || false;
  const isRoot = props.data.isRoot || false;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#94a3b8", width: 8, height: 8, border: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Skill name */}
        <span style={{ flex: 1, lineHeight: 1.4 }}>{props.data.label}</span>

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
              props.data.handleCheckSkill(props.data.skillId, e.target.checked)
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

/* Custom node: skill name + styled checkbox + React Flow handles */
function NoCheckSkillNode(props: any) {
  const isChecked =
    props.data.userDetailSkill?.skill_ids.includes(props.data.skillId) || false;
  const isRoot = props.data.isRoot || false;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#94a3b8", width: 8, height: 8, border: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Skill name */}
        <span style={{ flex: 1, lineHeight: 1.4 }}>{props.data.label}</span>
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
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [skillTree, setSkillTree] = useState<SkillTreeDetail | null>(null);
  const [skillTreeOriginal, setSkillTreeOriginal] =
    useState<SkillTreeDetail | null>(null); // Pour comparer les modifications
  const [selectedSkillForEditing, setSelectedSkillForEditing] =
    useState<Skill | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isModalDeleteOpen, setIsModalDeleteOpen] = useState(false);

  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [createSkillModalOpen, setCreateSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isSkillTreeModified, setIsSkillTreeModified] = useState(false);
  const [userDetailSkill, setUserDetailSkill] =
    useState<UserDetailSkill | null>(null);

  const deletePressed = useKeyPress(["Delete", "Backspace"]);

  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();

  const [isModalConfirmExitOpen, setIsModalConfirmExitOpen] = useState(false);
  const { favoriteTrees, handleFavorite } = useFavorites();

  const graphData = useMemo(() => {
    if (!skillTree) return { nodes: [], edges: [] };
    return transformSkillstoGraph(
      skillTree,
      isDarkMode,
      isEditing,
      userDetailSkill,
      handleCheckSkill,
    );
  }, [skillTree, isDarkMode, userDetailSkill, isEditing]);

  const isValidConnection = useCallback(
    (connection: { source: string; target: string }) => {
      // we are using getNodes and getEdges helpers here
      // to make sure we create isValidConnection function only once
      const nodes: Node[] = graphData.nodes;
      const edges: Edge[] = graphData.edges;
      const target = nodes.find((node) => node.id === connection.target);
      if (!target) return false;
      const hasCycle = (node: Node, visited = new Set()) => {
        if (visited.has(node.id)) return false;

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) return true;
          if (hasCycle(outgoer, visited)) return true;
        }
      };

      if (target.id === connection.source) return false;
      return !hasCycle(target);
    },
    [graphData.nodes, graphData.edges],
  );

  function changeUsersCheckedSkills(skillId: number, isChecked: boolean) {
    setUserDetailSkill((prev) => {
      if (!prev) return prev; // Juste pour satisfaire le type, dans la réalité ça ne devrait jamais arriver
      const hasSkill = prev.skill_ids.includes(skillId);
      if (isChecked && !hasSkill) {
        // Ajouter la compétence
        return {
          ...prev,
          skill_ids: [...prev.skill_ids, skillId],
        };
      } else if (!isChecked && hasSkill) {
        // Retirer la compétence
        return {
          ...prev,
          skill_ids: prev.skill_ids.filter((id) => id !== skillId),
        };
      }
      return prev;
    });
  }

  function handleCheckSkill(skillId: number, isChecked: boolean) {
    // Ici tu peux faire ce que tu veux avec le changement de checkbox
    if (!isAuthenticated) {
      toast.error("Vous devez être connecté pour cocher vos compétences.");
      return;
    }
    if (!userDetailSkill) return; // Juste pour satisfaire le type, dans la réalité ça ne devrait jamais arriver
    if (isChecked && userDetailSkill.skill_ids.includes(skillId)) return;
    if (!isChecked && !userDetailSkill.skill_ids.includes(skillId)) return;

    if (isChecked) {
      axiosInst
        .post("/users/skills-checked/", { skill_id: skillId })
        .then(() => {
          // Mettre à jour l'état local pour refléter le changement
          changeUsersCheckedSkills(skillId, isChecked);
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la mise à jour du statut de compétence:",
            error,
          );
        });
    } else {
      axiosInst
        .delete(`/users/skills-checked/${skillId}/`)
        .then(() => {
          // Mettre à jour l'état local pour refléter le changement
          changeUsersCheckedSkills(skillId, isChecked);
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la mise à jour du statut de compétence:",
            error,
          );
        });
    }
  }

  function isAuthorizedToEdit(): boolean {
    if (!isAuthenticated) return false;
    if (!skillTree) return false;
    const storedUsername = localStorage.getItem("username");
    return storedUsername === skillTree.creator_username;
  }

  function handleSkillUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSkillTree((prev) => {
      if (!prev || !selectedSkillForEditing || !isAuthorizedToEdit())
        return prev;
      return {
        ...prev,
        skills: prev.skills.map((s) =>
          s.id === selectedSkillForEditing.id ? selectedSkillForEditing : s,
        ),
      };
    });
    setSelectedSkillForEditing(null);
  }

  function handleCreateSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!newSkillName.trim() || !isAuthorizedToEdit()) return;
    const newSkill: Skill = {
      id: returnNewIdSkillNegative(skillTree!),
      name: newSkillName,
      description: newSkillDescription,
      unlock_ids: [],
      is_root: skillTree?.skills.length === 0, // Si c'est la première compétence, elle est racine
    };
    setSkillTree((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        skills: [...prev.skills, newSkill],
      };
    });
    setNewSkillName("");
    setNewSkillDescription("");
    setCreateSkillModalOpen(false);
  }

  function handleDeleteSkill(skillId: number) {
    // Test si le skill à supprimer est le root
    if (!skillTree || !isAuthorizedToEdit()) return;
    const skillToDelete = skillTree?.skills.find((s) => s.id === skillId);
    if (skillToDelete?.is_root) {
      toast.error(
        "Impossible de supprimer la compétence racine. Veuillez réorganiser votre arbre avant.",
      );
      return;
    }

    setSkillTree((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        skills: prev.skills
          .filter((s) => s.id !== skillId)
          .map((s) => ({
            ...s,
            unlock_ids: s.unlock_ids.filter((id) => id !== skillId),
          })),
      };
    });
    setSelectedSkillForEditing(null);
  }

  function handleSaveToBackend() {
    if (!skillTree || !isAuthorizedToEdit()) return;
    axiosInst
      .put(`/skill-trees/save/${id}/`, skillTree)
      .then((response) => {
        setSkillTreeOriginal(skillTree); // Mettre à jour l'original après sauvegarde réussie
        setIsSkillTreeModified(false);
        toast.success("Données sauvegardées avec succès !");
        console.log("Données sauvegardées avec succès:", response.data);
      })
      .catch((error) => {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error("Erreur lors de la sauvegarde.");
      });
  }

  function getNewRoot(newSkills: Skill[], skillId: number): Skill {
    const skill = newSkills.find((s) => s.id === skillId);
    if (!skill) throw new Error("Skill not found");
    const parent = newSkills.find((s) => s.unlock_ids.includes(skillId));
    if (!parent) return skill; // Si pas de parent, c'est le root
    return getNewRoot(newSkills, parent.id);
  }

  function handleEdgeCreate(connection: Connection) {
    if (!isEditing || !isAuthorizedToEdit()) return;
    const sourceId = parseInt(connection.source);
    const targetId = parseInt(connection.target);

    if (!skillTree) return;

    // Étape 1 : vérifier que le source existe et que l'edge n'existe pas déjà
    const sourceSkill = skillTree.skills.find((s) => s.id === sourceId);
    if (!sourceSkill) return;
    if (sourceSkill.unlock_ids.includes(targetId)) return;

    // Étape 2 : construire le nouveau tableau de skills avec l'edge ajouté
    let newSkills = skillTree.skills.map((s) =>
      s.id === sourceId ? { ...s, unlock_ids: [...s.unlock_ids, targetId] } : s,
    );

    // Étape 3 : vérifier si le target est le root actuel
    const targetSkill = newSkills.find((s) => s.id === targetId);
    if (targetSkill?.is_root) {
      // Étape 4 : trouver le nouveau root avec getNewRoot
      const newRoot = getNewRoot(newSkills, sourceId);
      // Étape 5 : changer is_root dans newSkills
      newSkills = newSkills.map((s) => {
        if (s.id === newRoot.id) {
          return { ...s, is_root: true };
        } else if (s.is_root && s.id !== newRoot.id) {
          return { ...s, is_root: false };
        }
        return s;
      });
    }

    // Étape 6 : un seul setState

    setSkillTree({ ...skillTree, skills: newSkills });
  }

  function handleEdgeReconnect(oldEdge: Edge, newConnection: Connection) {
    if (!isEditing || !isAuthorizedToEdit()) return;
    const oldSourceId = oldEdge.source;
    const oldTargetId = oldEdge.target;
    const newSourceId = newConnection.source;
    const newTargetId = newConnection.target;

    // Supprimer l'ancienne relation
    handleEdgeDelete({ ...oldEdge, source: oldSourceId, target: oldTargetId });

    // Ajouter la nouvelle relation
    handleEdgeCreate({
      source: newSourceId,
      target: newTargetId,
    } as Connection);
  }

  function handleEdgeDelete(edge: Edge) {
    if (!isEditing || !isAuthorizedToEdit()) return;
    console.log("Suppression de l'arête:", edge);
    const sourceId = edge.source;
    const targetId = edge.target;
    setSkillTree((prev) => {
      if (!prev) return prev;
      const sourceSkill = prev.skills.find((s) => s.id === parseInt(sourceId));
      if (!sourceSkill) return prev;
      return {
        ...prev,
        skills: prev.skills.map((s) =>
          s.id === sourceSkill.id
            ? {
                ...s,
                unlock_ids: s.unlock_ids.filter(
                  (id) => id !== parseInt(targetId),
                ),
              }
            : s,
        ),
      };
    });
  }

  function handleEditButton() {
    if (isEditing) {
      // Si on était en mode édition et qu'on clique pour terminer, on sauvegarde
      if (isSkillTreeModified) {
        // Demander confirmation si des modifications ont été faites
        setIsModalConfirmExitOpen(true);
        return;
      }
      setIsEditingTitle(false);
      setIsEditingDesc(false);
    }
    setIsEditing((prev) => !prev);
    setSelectedEdge(null); // Réinitialiser la sélection d'arête lors du changement de mode
  }

  function compareSkillTreeOriginal(): boolean {
    if (!skillTree || !skillTreeOriginal) return false;
    return JSON.stringify(skillTree) !== JSON.stringify(skillTreeOriginal);
  }

  useEffect(() => {
    if (isAuthenticated) {
      axiosInst
        .get<UserDetailSkill>("/users/skills-checked/")
        .then((response) => {
          setUserDetailSkill(response.data);
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la récupération des compétences cochées:",
            error,
          );
        });
    } else {
      setUserDetailSkill(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setIsSkillTreeModified(compareSkillTreeOriginal());
  }, [skillTree]);

  useEffect(() => {
    if (deletePressed && selectedEdge) {
      handleEdgeDelete(selectedEdge);
      setSelectedEdge(null); // Réinitialiser la sélection après suppression
    }
  }, [deletePressed]);

  useEffect(() => {
    // Cette fonction s'exécute au montage du composant
    axiosInst
      .get<SkillTreeDetail>(`/skill-trees/${id}/`)
      .then((response) => {
        setSkillTree(response.data);
        setSkillTreeOriginal(response.data); // Garder une copie originale pour comparer les modifications
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Erreur:", error);
        setIsError(true);
        setIsLoading(false);
      });
  }, [id]); // Le tableau de dépendances contient 'id' pour recharger les données si l'id change

  const handleDeleteTree = () => {
    if (!skillTree || !isAuthorizedToEdit()) return;

    axiosInst
      .delete(`/skill-trees/${skillTree.id}/`)
      .then(() => {
        navigate("/"); // Rediriger vers la liste après suppression
        // Fermer le modal
        setIsModalDeleteOpen(false);
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression:", error);
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-lg text-slate-500 dark:text-slate-400">
          Chargement...
        </p>
      </div>
    );
  }

  if (isError || !skillTree) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-lg text-red-500 dark:text-red-400">
          Erreur lors du chargement de l'arbre de compétences.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header : titre + description + actions */}
      <div className="px-6 py-4 border-b shadow-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        {/* Titre */}
        <div className="flex items-center justify-between">
          <div>
            {isEditingTitle && isAuthorizedToEdit() ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsEditingTitle(false);
                }}
                className="flex items-center gap-3 mb-2"
              >
                <input
                  type="text"
                  value={skillTree.name}
                  onChange={(e) =>
                    setSkillTree({ ...skillTree, name: e.target.value })
                  }
                  className="text-2xl font-bold px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 border text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  OK
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {skillTree?.name}
                </h1>
                {!isEditing && (
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
                    {favoriteTrees.includes(skillTree.id) ? "\u2605" : "\u2606"}
                  </button>
                )}
                {isEditing && isAuthorizedToEdit() && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-sm transition-colors duration-200 text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
                  >
                    Modifier
                  </button>
                )}
              </div>
            )}

            {/* Description */}
            {isEditingDesc && isAuthorizedToEdit() ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsEditingDesc(false);
                }}
                className="flex items-start gap-3 mb-3"
              >
                <textarea
                  value={skillTree.description || ""}
                  onChange={(e) =>
                    setSkillTree({ ...skillTree, description: e.target.value })
                  }
                  className="text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 resize-none border text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  rows={2}
                />

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  OK
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {skillTree.description || "Aucune description"}
                </p>

                {isEditing && isAuthorizedToEdit() && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
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
            {isAuthorizedToEdit() && (
              <button
                onClick={handleEditButton}
                className="px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                {isEditing ? "Terminer" : "Éditer"}
              </button>
            )}

            {isEditing && isAuthorizedToEdit() && (
              <div>
                <button
                  onClick={() => setCreateSkillModalOpen(true)}
                  className="px-3 py-1.5 text-sm text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors duration-200"
                >
                  + Ajouter une compétence
                </button>
                <button
                  onClick={handleSaveToBackend}
                  className="px-4 py-1.5 text-sm text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setIsModalDeleteOpen(true)}
                  className="px-3 py-1.5 text-sm hover:text-white hover:bg-red-500 border rounded-lg transition-colors duration-200 text-red-500 dark:text-red-400 border-red-300 dark:border-red-500/30"
                >
                  Supprimer l'arbre
                </button>
                {isSkillTreeModified && (
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
          nodesConnectable={isEditing}
          nodeTypes={nodeTypes}
          onConnect={handleEdgeCreate}
          onReconnect={handleEdgeReconnect}
          onEdgeClick={(event, edge) => {
            event.preventDefault();
            if (!isEditing) return;
            setSelectedEdge(edge);
          }}
          zoomOnScroll={true}
          zoomOnDoubleClick={false}
          onNodeDoubleClick={(event, node) => {
            event.preventDefault();
            if (!isEditing) return;
            console.log(node.id);
            const skill: Skill | undefined = skillTree?.skills.find(
              (s) => s.id === parseInt(node.id, 10),
            );
            setSelectedSkillForEditing(skill || null);
          }}
          nodes={graphData.nodes}
          edges={graphData.edges}
          isValidConnection={isValidConnection}
          colorMode={isDarkMode ? "dark" : "light"}
          proOptions={{ hideAttribution: true }}
        />
      </div>

      {/* Modal : modifier une compétence */}
      {selectedSkillForEditing && isEditing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="rounded-xl shadow-lg p-6 w-full max-w-md bg-white dark:bg-slate-800">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Modifier : {selectedSkillForEditing.name}
            </h2>
            <form onSubmit={handleSkillUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Nom
                </label>
                <input
                  type="text"
                  value={selectedSkillForEditing.name}
                  onChange={(e) =>
                    setSelectedSkillForEditing({
                      ...selectedSkillForEditing,
                      name: e.target.value,
                    })
                  }
                  className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={selectedSkillForEditing.description || ""}
                  onChange={(e) =>
                    setSelectedSkillForEditing({
                      ...selectedSkillForEditing,
                      description: e.target.value,
                    })
                  }
                  className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteSkill(selectedSkillForEditing.id)}
                  className="text-sm transition-colors duration-200 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Supprimer cette compétence
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSkillForEditing(null)}
                    className="px-4 py-2 text-sm rounded-lg transition-colors duration-200 text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : créer une compétence */}
      {createSkillModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="rounded-xl shadow-lg p-6 w-full max-w-md bg-white dark:bg-slate-800">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Nouvelle compétence
            </h2>
            <form onSubmit={handleCreateSkill}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Nom
                </label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={newSkillDescription}
                  onChange={(e) => setNewSkillDescription(e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateSkillModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg transition-colors duration-200 text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white font-medium bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors duration-200"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : confirmer suppression de l'arbre */}
      {isModalDeleteOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="rounded-xl shadow-lg p-6 w-full max-w-md bg-white dark:bg-slate-800">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              Supprimer cet arbre ?
            </h2>
            <p className="text-sm mb-6 text-gray-500 dark:text-slate-400">
              L'arbre "{skillTree.name}" et toutes ses compétences seront
              définitivement supprimés. Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalDeleteOpen(false);
                }}
                className="px-4 py-2 text-sm rounded-lg transition-colors duration-200 text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteTree}
                className="px-4 py-2 text-sm text-white font-medium bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal : confirmer sortie sans sauvegarder */}
      {isModalConfirmExitOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="rounded-xl shadow-lg p-6 w-full max-w-md bg-white dark:bg-slate-800">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              Quitter sans sauvegarder ?
            </h2>
            <p className="text-sm mb-6 text-gray-500 dark:text-slate-400">
              Vous avez des modifications non sauvegardées. Êtes-vous sûr de
              vouloir quitter sans sauvegarder ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalConfirmExitOpen(false);
                }}
                className="px-4 py-2 text-sm rounded-lg transition-colors duration-200 text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsModalConfirmExitOpen(false);
                  setIsEditing(false);
                  setSkillTree(skillTreeOriginal); // Revenir à l'état original
                }}
                className="px-4 py-2 text-sm text-white font-medium bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
              >
                Quitter sans sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillTreeDetailPage;
