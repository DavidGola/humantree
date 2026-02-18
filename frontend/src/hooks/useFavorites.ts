import { useState, useEffect } from "react";
import type { SkillTreeSimple } from "../types/skillTree";
import axiosInst from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

export function useFavorites() {
  const [favoriteTrees, setFavoriteTrees] = useState<number[]>([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      axiosInst
        .get<SkillTreeSimple[]>("/skill-trees/my-favorite-skill-trees/")
        .then((response) => {
          setFavoriteTrees(response.data.map((tree) => tree.id));
        })
        .catch((error) => {
          console.error("Erreur:", error);
        });
    } else {
      setFavoriteTrees([]);
    }
  }, [isAuthenticated]);

  const handleFavorite = (treeId: number) => {
    if (!isAuthenticated) {
      toast.error("Vous devez être connecté pour ajouter aux favoris.");
      return;
    }
    const isFavorite = favoriteTrees.includes(treeId);
    const request = isFavorite
      ? axiosInst.delete(`/skill-trees/favorite/${treeId}`)
      : axiosInst.post(`/skill-trees/favorite/${treeId}`);
    request
      .then(() => {
        setFavoriteTrees((prev) =>
          isFavorite ? prev.filter((id) => id !== treeId) : [...prev, treeId],
        );
      })
      .catch((error) => {
        console.error("Erreur lors de la mise à jour des favoris:", error);
        toast.error("Une erreur est survenue. Veuillez réessayer.");
      });
  };

  return { favoriteTrees, setFavoriteTrees, handleFavorite };
}
