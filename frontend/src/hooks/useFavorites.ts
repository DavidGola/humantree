import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { skillTreeApi } from "../api/skillTreeApi";

export function useFavorites() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteTrees = [] } = useQuery({
    queryKey: ["favorites", isAuthenticated],
    queryFn: () =>
      skillTreeApi
        .getMyFavorites()
        .then((trees) => trees.map((tree) => tree.id)),
    enabled: isAuthenticated,
  });

  const handleFavorite = (treeId: number) => {
    if (!isAuthenticated) {
      toast.error("Vous devez être connecté pour ajouter aux favoris.");
      return;
    }
    const isFavorite = favoriteTrees.includes(treeId);
    const request = isFavorite
      ? skillTreeApi.removeFavorite(treeId)
      : skillTreeApi.addFavorite(treeId);
    request
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["favorites"] });
        queryClient.invalidateQueries({ queryKey: ["skillTrees"] });
      })
      .catch(() => {
        toast.error("Une erreur est survenue. Veuillez réessayer.");
      });
  };

  return { favoriteTrees, handleFavorite };
}
