import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { skillTreeApi } from "../api/skillTreeApi";
import { userApi } from "../api/userApi";
import {
  transformSkillstoGraph,
  returnNewIdSkillNegative,
} from "../utils/skillTreeGraphs";
import type { SkillTreeDetail, Skill } from "../types/skillTree";
import type { UserDetailSkill } from "../types/user";
import type { Node, Edge } from "@xyflow/react";
import { getOutgoers, useKeyPress } from "@xyflow/react";
import type { Connection } from "@xyflow/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useSkillTreeDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [skillTree, setSkillTree] = useState<SkillTreeDetail | null>(null);
  const [skillTreeOriginal, setSkillTreeOriginal] =
    useState<SkillTreeDetail | null>(null); // Pour comparer les modifications
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

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

  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isModalConfirmExitOpen, setIsModalConfirmExitOpen] = useState(false);

  function changeUsersCheckedSkills(skillId: number, isChecked: boolean) {
    setUserDetailSkill((prev) => {
      if (!prev) return prev;
      const hasSkill = prev.skill_ids.includes(skillId);
      if (isChecked && !hasSkill) {
        return {
          ...prev,
          skill_ids: [...prev.skill_ids, skillId],
        };
      } else if (!isChecked && hasSkill) {
        return {
          ...prev,
          skill_ids: prev.skill_ids.filter((id) => id !== skillId),
        };
      }
      return prev;
    });
  }

  const handleCheckSkill = useCallback(
    (skillId: number, isChecked: boolean) => {
      if (!isAuthenticated) {
        toast.error("Vous devez être connecté pour cocher vos compétences.");
        return;
      }
      if (!userDetailSkill) return;
      if (isChecked && userDetailSkill.skill_ids.includes(skillId)) return;
      if (!isChecked && !userDetailSkill.skill_ids.includes(skillId)) return;

      const request = isChecked
        ? userApi.addSkillChecked(skillId)
        : userApi.removeSkillChecked(skillId);
      request
        .then(() => {
          changeUsersCheckedSkills(skillId, isChecked);
        })
        .catch(() => {
          toast.error("Erreur lors de la mise à jour de la compétence.");
        });
    },
    [isAuthenticated, userDetailSkill],
  );

  const graphData = useMemo(() => {
    if (!skillTree) return { nodes: [], edges: [] };
    return transformSkillstoGraph(
      skillTree,
      isDarkMode,
      isEditing,
      userDetailSkill,
      handleCheckSkill,
    );
  }, [skillTree, isDarkMode, userDetailSkill, isEditing, handleCheckSkill]);

  const isValidConnection = useCallback(
    (connection: { source: string; target: string }) => {
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

  function isAuthorizedToEdit(): boolean {
    if (!isAuthenticated) return false;
    if (!skillTree) return false;
    const storedUsername = localStorage.getItem("username");
    return storedUsername === skillTree.creator_username;
  }

  function handleSkillUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSkillTree((prev) => {
      if (!prev || !selectedSkill || !isAuthorizedToEdit()) return prev;
      return {
        ...prev,
        skills: prev.skills.map((s) =>
          s.id === selectedSkill.id ? selectedSkill : s,
        ),
      };
    });
    setSelectedSkill(null);
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
    setSelectedSkill(null);
  }

  function handleSaveToBackend() {
    if (!skillTree || !isAuthorizedToEdit()) return;
    skillTreeApi
      .save(id!, skillTree)
      .then(() => {
        setSkillTreeOriginal(skillTree);
        setIsSkillTreeModified(false);
        queryClient.invalidateQueries({ queryKey: ["skillTree", id] });
        toast.success("Données sauvegardées avec succès !");
      })
      .catch(() => {
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

  const { data: fetchedUserDetailSkill } = useQuery({
    queryKey: ["userSkillsChecked", isAuthenticated],
    queryFn: () => userApi.getSkillsChecked(),
    enabled: isAuthenticated,
  });

  // Copier dans le state local (modifié localement lors du check/uncheck)
  useEffect(() => {
    if (fetchedUserDetailSkill) {
      setUserDetailSkill(fetchedUserDetailSkill);
    } else if (!isAuthenticated) {
      setUserDetailSkill(null);
    }
  }, [fetchedUserDetailSkill, isAuthenticated]);

  useEffect(() => {
    setIsSkillTreeModified(compareSkillTreeOriginal());
  }, [skillTree, skillTreeOriginal]);

  useEffect(() => {
    if (deletePressed && selectedEdge) {
      handleEdgeDelete(selectedEdge);
      setSelectedEdge(null);
    }
  }, [deletePressed, selectedEdge]);

  const {
    data: fetchedSkillTree,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["skillTree", id],
    queryFn: () => skillTreeApi.getById(id!),
  });

  // Copier les données du serveur dans le state local pour l'édition
  useEffect(() => {
    if (fetchedSkillTree && !skillTree) {
      setSkillTree(fetchedSkillTree);
      setSkillTreeOriginal(fetchedSkillTree);
    }
  }, [fetchedSkillTree]);

  const handleDeleteTree = () => {
    if (!skillTree || !isAuthorizedToEdit()) return;

    skillTreeApi
      .remove(skillTree.id)
      .then(() => {
        navigate("/"); // Rediriger vers la liste après suppression
        // Fermer le modal
        setIsModalDeleteOpen(false);
      })
      .catch(() => {
        toast.error("Erreur lors de la suppression de l'arbre.");
      });
  };

  return {
    // État de chargement
    loading: {
      isLoading,
      isError,
    },
    // Données du skill tree
    tree: {
      skillTree,
      setSkillTree,
      skillTreeOriginal,
      graphData,
      isDarkMode,
      isAuthorizedToEdit,
    },
    // Sélection (skill ou edge)
    selection: {
      selectedSkill,
      setSelectedSkill,
      selectedEdge,
      setSelectedEdge,
    },
    // Mode édition
    editing: {
      isEditing,
      setIsEditing,
      isEditingTitle,
      setIsEditingTitle,
      isEditingDesc,
      setIsEditingDesc,
      isSkillTreeModified,
      handleEditButton,
      handleSaveToBackend,
      isValidConnection,
    },
    // CRUD skills
    skills: {
      handleSkillUpdate,
      handleCreateSkill,
      handleDeleteSkill,
      createSkillModalOpen,
      setCreateSkillModalOpen,
      newSkillName,
      setNewSkillName,
      newSkillDescription,
      setNewSkillDescription,
    },
    // CRUD edges
    edges: {
      handleEdgeCreate,
      handleEdgeReconnect,
      handleEdgeDelete,
    },
    // Suppression de l'arbre
    deleteTree: {
      isModalDeleteOpen,
      setIsModalDeleteOpen,
      handleDeleteTree,
    },
    // Modal de confirmation sortie
    confirmExit: {
      isModalConfirmExitOpen,
      setIsModalConfirmExitOpen,
    },
  };
}
