import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { skillTreeApi } from "../api/skillTreeApi";
import type { SkillTreeSimple } from "../types/skillTree";

interface LinkTreeModalProps {
  onSelect: (treeId: number, treeName: string) => void;
  onClose: () => void;
  excludeTreeIds: number[];
}

export function LinkTreeModal({
  onSelect,
  onClose,
  excludeTreeIds,
}: LinkTreeModalProps) {
  const [trees, setTrees] = useState<SkillTreeSimple[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    skillTreeApi
      .getAll()
      .then((data) => setTrees(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = trees.filter(
    (t) =>
      !excludeTreeIds.includes(t.id) &&
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <Modal onClose={onClose} title="Lier un arbre" size="large">
      <input
        type="text"
        placeholder="Rechercher un arbre..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2.5 text-sm rounded-lg mb-4 surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
      />
      <div className="overflow-y-auto flex-1 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Chargement...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Aucun arbre trouvé.
          </p>
        ) : (
          filtered.map((tree) => (
            <button
              key={tree.id}
              onClick={() => onSelect(tree.id, tree.name)}
              className="w-full text-left px-4 py-3 rounded-lg surface-card hover:!bg-[var(--surface-hover)] transition-colors duration-200"
            >
              <p className="font-display font-medium text-gray-900 dark:text-white">
                {tree.name}
              </p>
              {tree.description && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 truncate">
                  {tree.description}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                par {tree.creator_username}
              </p>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
