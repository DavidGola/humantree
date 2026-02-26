import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../utils/apiErrors";
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

const BREADCRUMB_KEY = "treeBreadcrumb";

export interface BreadcrumbEntry {
  id: number;
  name: string;
}

function readBreadcrumb(): BreadcrumbEntry[] {
  try {
    return JSON.parse(sessionStorage.getItem(BREADCRUMB_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeBreadcrumb(entries: BreadcrumbEntry[]) {
  sessionStorage.setItem(BREADCRUMB_KEY, JSON.stringify(entries));
}

export function useSkillTreeDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [skillTree, setSkillTree] = useState<SkillTreeDetail | null>(null);
  const [skillTreeOriginal, setSkillTreeOriginal] =
    useState<SkillTreeDetail | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [isModalDeleteOpen, setIsModalDeleteOpen] = useState(false);

  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [createSkillModalOpen, setCreateSkillModalOpen] = useState(false);
  const [linkTreeModalOpen, setLinkTreeModalOpen] = useState(false);
  const [createSubTreeModalOpen, setCreateSubTreeModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [newSubTreeName, setNewSubTreeName] = useState("");
  const [newSubTreeDescription, setNewSubTreeDescription] = useState("");

  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSkillTreeModified, setIsSkillTreeModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userDetailSkill, setUserDetailSkill] =
    useState<UserDetailSkill | null>(null);

  const deletePressed = useKeyPress(["Delete", "Backspace"]);

  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const hasUnsavedChanges = isEditing && isSkillTreeModified;

  // Lire le breadcrumb au chargement / changement d'id
  // Si l'arbre courant apparaît dans le breadcrumb (ex: retour navigateur),
  // tronquer jusqu'à cet index pour éviter "test / test"
  useEffect(() => {
    const stored = readBreadcrumb();
    const currentId = Number(id);
    const idx = stored.findIndex((entry) => entry.id === currentId);
    if (idx !== -1) {
      const trimmed = stored.slice(0, idx);
      writeBreadcrumb(trimmed);
      setBreadcrumb(trimmed);
    } else {
      setBreadcrumb(stored);
    }
  }, [id]);

  // Reset le state local quand l'id change (navigation entre arbres)
  useEffect(() => {
    setSkillTree(null);
    setSkillTreeOriginal(null);
    setSelectedSkill(null);
    setSelectedEdge(null);
    setIsEditingTitle(false);
    setIsEditingDesc(false);
    setIsEditingTags(false);
  }, [id]);

  // Quitter le mode édition si l'utilisateur se déconnecte
  useEffect(() => {
    if (!isAuthenticated && isEditing) {
      setSkillTree(skillTreeOriginal);
      setIsEditing(false);
      setIsEditingTitle(false);
      setIsEditingDesc(false);
      setIsEditingTags(false);
    }
  }, [isAuthenticated]);

  function changeUsersCheckedSkills(skillId: number, isChecked: boolean) {
    setUserDetailSkill((prev) => {
      if (!prev) return prev;
      const hasSkill = prev.skill_ids.includes(skillId);
      if (isChecked && !hasSkill) {
        return { ...prev, skill_ids: [...prev.skill_ids, skillId] };
      } else if (!isChecked && hasSkill) {
        return { ...prev, skill_ids: prev.skill_ids.filter((id) => id !== skillId) };
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
        .then(() => changeUsersCheckedSkills(skillId, isChecked))
        .catch((err) => toast.error(getApiErrorMessage(err)));
    },
    [isAuthenticated, userDetailSkill],
  );

  const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  });

  // Stats des sous-arbres liés : linkedTreeId -> { checked, total }
  const [linkedTreeStats, setLinkedTreeStats] = useState<
    Map<number, { checked: number; total: number }>
  >(new Map());

  useEffect(() => {
    if (!skillTree) {
      setLinkedTreeStats(new Map());
      return;
    }
    const linkedTreeIds = skillTree.skills
      .filter((s) => s.linked_tree_id !== null)
      .map((s) => s.linked_tree_id!);
    if (linkedTreeIds.length === 0) {
      setLinkedTreeStats(new Map());
      return;
    }
    let cancelled = false;
    const checkedIds = new Set(userDetailSkill?.skill_ids ?? []);
    Promise.all(
      linkedTreeIds.map((treeId) =>
        skillTreeApi
          .getById(String(treeId))
          .then((detail) => {
            const total = detail.skills.length;
            const checked = detail.skills.filter((s) => checkedIds.has(s.id)).length;
            return [treeId, { checked, total }] as const;
          })
          .catch(() => [treeId, { checked: 0, total: 0 }] as const),
      ),
    ).then((entries) => {
      if (!cancelled) setLinkedTreeStats(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [skillTree, userDetailSkill]);

  useEffect(() => {
    if (!skillTree) {
      setGraphData({ nodes: [], edges: [] });
      return;
    }
    let cancelled = false;
    transformSkillstoGraph(
      skillTree,
      isDarkMode,
      isEditing,
      userDetailSkill,
      handleCheckSkill,
      linkedTreeStats,
    ).then((result) => {
      if (!cancelled) setGraphData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [skillTree, isDarkMode, userDetailSkill, isEditing, handleCheckSkill, linkedTreeStats]);

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

  function startEditingTags() {
    if (!skillTree) return;
    setTagsInput(skillTree.tags?.join(", ") || "");
    setIsEditingTags(true);
  }

  function submitTagsEdit() {
    if (!skillTree) return;
    const newTags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
      .filter((t) => t.length > 0);

    if (newTags.length > 10) {
      toast.error("Maximum 10 tags autorisés.");
      return;
    }
    if (newTags.some((t) => t.length > 30)) {
      toast.error("Chaque tag ne peut pas dépasser 30 caractères.");
      return;
    }

    const uniqueTags = [...new Set(newTags)];
    setSkillTree({ ...skillTree, tags: uniqueTags });
    setIsEditingTags(false);
  }

  function isAuthorizedToEdit(): boolean {
    if (!isAuthenticated) return false;
    if (!skillTree) return false;
    const storedUsername = localStorage.getItem("username");
    return storedUsername === skillTree.creator_username;
  }

  function handleSkillUpdate(updatedSkill: Skill) {
    setSkillTree((prev) => {
      if (!prev || !isAuthorizedToEdit()) return prev;
      return {
        ...prev,
        skills: prev.skills.map((s) =>
          s.id === updatedSkill.id ? updatedSkill : s,
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
      linked_tree_id: null,
      is_root: skillTree?.skills.length === 0,
    };
    setSkillTree((prev) => {
      if (!prev) return prev;
      return { ...prev, skills: [...prev.skills, newSkill] };
    });
    setNewSkillName("");
    setNewSkillDescription("");
    setCreateSkillModalOpen(false);
  }

  function handleLinkTree(sourceTreeId: number, treeName: string) {
    if (!skillTree || !isAuthorizedToEdit()) return;
    const newSkill: Skill = {
      id: returnNewIdSkillNegative(skillTree),
      name: treeName,
      description: null,
      unlock_ids: [],
      linked_tree_id: sourceTreeId,
      is_root: skillTree.skills.length === 0,
    };
    setSkillTree((prev) => {
      if (!prev) return prev;
      return { ...prev, skills: [...prev.skills, newSkill] };
    });
    setLinkTreeModalOpen(false);
  }

  async function handleCreateSubTree(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubTreeName.trim() || !skillTree || !isAuthorizedToEdit()) return;
    try {
      const newTree = await skillTreeApi.create(
        newSubTreeName,
        newSubTreeDescription || "",
      );
      const newSkill: Skill = {
        id: returnNewIdSkillNegative(skillTree),
        name: newSubTreeName,
        description: null,
        unlock_ids: [],
        linked_tree_id: newTree.id,
        is_root: skillTree.skills.length === 0,
      };
      setSkillTree((prev) =>
        prev ? { ...prev, skills: [...prev.skills, newSkill] } : prev,
      );
      setCreateSubTreeModalOpen(false);
      setNewSubTreeName("");
      setNewSubTreeDescription("");
      toast.success("Sous-arbre créé !");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  function navigateToLinkedTree(treeId: number) {
    if (!skillTree) return;
    if (isSkillTreeModified) {
      toast.error(
        "Sauvegardez vos modifications avant de naviguer vers un sous-arbre.",
      );
      return;
    }
    const newBreadcrumb = [
      ...breadcrumb,
      { id: skillTree.id, name: skillTree.name },
    ];
    writeBreadcrumb(newBreadcrumb);
    navigate(`/tree/${treeId}`);
  }

  function navigateBack(index: number) {
    const target = breadcrumb[index];
    if (!target) return;
    const newBreadcrumb = breadcrumb.slice(0, index);
    writeBreadcrumb(newBreadcrumb);
    navigate(`/tree/${target.id}`);
  }

  function clearBreadcrumb() {
    writeBreadcrumb([]);
    setBreadcrumb([]);
  }

  function handleDeleteSkill(skillId: number) {
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
    setIsSaving(true);
    const saveId = String(skillTree.id);
    skillTreeApi
      .save(saveId, skillTree)
      .then(() => {
        setSkillTreeOriginal(skillTree);
        setIsSkillTreeModified(false);
        queryClient.invalidateQueries({ queryKey: ["skillTree", saveId] });
        toast.success("Données sauvegardées avec succès !");
      })
      .catch((err) => toast.error(getApiErrorMessage(err)))
      .finally(() => setIsSaving(false));
  }

  function getNewRoot(newSkills: Skill[], skillId: number): Skill {
    const skill = newSkills.find((s) => s.id === skillId);
    if (!skill) throw new Error("Skill not found");
    const parent = newSkills.find((s) => s.unlock_ids.includes(skillId));
    if (!parent) return skill;
    return getNewRoot(newSkills, parent.id);
  }

  function handleEdgeCreate(connection: Connection) {
    if (!isEditing || !isAuthorizedToEdit()) return;
    const sourceId = parseInt(connection.source);
    const targetId = parseInt(connection.target);
    if (!skillTree) return;

    const sourceSkill = skillTree.skills.find((s) => s.id === sourceId);
    if (!sourceSkill) return;
    if (sourceSkill.unlock_ids.includes(targetId)) return;

    let newSkills = skillTree.skills.map((s) =>
      s.id === sourceId ? { ...s, unlock_ids: [...s.unlock_ids, targetId] } : s,
    );

    const targetSkill = newSkills.find((s) => s.id === targetId);
    if (targetSkill?.is_root) {
      const newRoot = getNewRoot(newSkills, sourceId);
      newSkills = newSkills.map((s) => {
        if (s.id === newRoot.id) return { ...s, is_root: true };
        else if (s.is_root && s.id !== newRoot.id) return { ...s, is_root: false };
        return s;
      });
    }

    setSkillTree({ ...skillTree, skills: newSkills });
  }

  function handleEdgeReconnect(oldEdge: Edge, newConnection: Connection) {
    if (!isEditing || !isAuthorizedToEdit()) return;
    handleEdgeDelete({ ...oldEdge, source: oldEdge.source, target: oldEdge.target });
    handleEdgeCreate({
      source: newConnection.source,
      target: newConnection.target,
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
            ? { ...s, unlock_ids: s.unlock_ids.filter((id) => id !== parseInt(targetId)) }
            : s,
        ),
      };
    });
  }

  const [showExitEditModal, setShowExitEditModal] = useState(false);

  function handleEditButton() {
    if (isEditing) {
      if (isSkillTreeModified) {
        setShowExitEditModal(true);
        return;
      }
      setIsEditingTitle(false);
      setIsEditingDesc(false);
      setIsEditingTags(false);
    }
    setIsEditing((prev) => !prev);
    setSelectedEdge(null);
  }

  function discardChanges() {
    setSkillTree(skillTreeOriginal);
    setIsEditing(false);
    setIsEditingTitle(false);
    setIsEditingDesc(false);
    setIsEditingTags(false);
    setShowExitEditModal(false);
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

  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const {
    data: fetchedSkillTree,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["skillTree", id],
    queryFn: () => skillTreeApi.getById(id!),
  });

  useEffect(() => {
    if (fetchedSkillTree && !skillTree) {
      setSkillTree(fetchedSkillTree);
      setSkillTreeOriginal(fetchedSkillTree);
    }
  }, [fetchedSkillTree, skillTree]);

  const handleDeleteTree = () => {
    if (!skillTree || !isAuthorizedToEdit()) return;
    setIsDeleting(true);
    skillTreeApi
      .remove(skillTree.id)
      .then(() => {
        setIsModalDeleteOpen(false);
        // Si on est dans un sous-arbre (breadcrumb), revenir au parent
        if (breadcrumb.length > 0) {
          const parent = breadcrumb[breadcrumb.length - 1];
          const newBreadcrumb = breadcrumb.slice(0, -1);
          writeBreadcrumb(newBreadcrumb);
          toast.success("Sous-arbre supprimé.");
          navigate(`/tree/${parent.id}`);
        } else {
          navigate("/");
        }
      })
      .catch((err) => toast.error(getApiErrorMessage(err)))
      .finally(() => setIsDeleting(false));
  };

  return {
    loading: { isLoading, isError },
    tree: {
      skillTree,
      setSkillTree,
      skillTreeOriginal,
      graphData,
      isDarkMode,
      isAuthorizedToEdit,
    },
    selection: {
      selectedSkill,
      setSelectedSkill,
      selectedEdge,
      setSelectedEdge,
    },
    editing: {
      isEditing,
      setIsEditing,
      isEditingTitle,
      setIsEditingTitle,
      isEditingDesc,
      setIsEditingDesc,
      isEditingTags,
      setIsEditingTags,
      tagsInput,
      setTagsInput,
      startEditingTags,
      submitTagsEdit,
      isSkillTreeModified,
      isSaving,
      handleEditButton,
      handleSaveToBackend,
      isValidConnection,
    },
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
    linkedTrees: {
      linkTreeModalOpen,
      setLinkTreeModalOpen,
      handleLinkTree,
      createSubTreeModalOpen,
      setCreateSubTreeModalOpen,
      newSubTreeName,
      setNewSubTreeName,
      newSubTreeDescription,
      setNewSubTreeDescription,
      handleCreateSubTree,
      navigateToLinkedTree,
      navigateBack,
      breadcrumb,
      clearBreadcrumb,
    },
    edges: {
      handleEdgeCreate,
      handleEdgeReconnect,
      handleEdgeDelete,
    },
    deleteTree: {
      isModalDeleteOpen,
      setIsModalDeleteOpen,
      isDeleting,
      handleDeleteTree,
    },
    unsavedGuard: {
      blocker,
      showExitEditModal,
      setShowExitEditModal,
      discardChanges,
    },
  };
}
