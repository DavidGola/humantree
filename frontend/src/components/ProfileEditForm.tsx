import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { Button } from "./Button";

interface ProfileEditFormProps {
  currentBio: string;
  onClose: () => void;
}

export default function ProfileEditForm({
  currentBio,
  onClose,
}: ProfileEditFormProps) {
  const [bio, setBio] = useState(currentBio);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { bio: string }) => userApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      onClose();
    },
  });

  return (
    <div className="mt-6 p-4 rounded-xl surface-card">
      <h3 className="text-sm font-display font-semibold text-gray-700 dark:text-slate-300 mb-3">
        Modifier le profil
      </h3>
      <div>
        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
          Bio ({bio.length}/500)
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2.5 text-sm rounded-lg surface-input focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          placeholder="Parlez de vous..."
        />
      </div>
      <div className="flex gap-3 mt-3">
        <Button
          variant="primary"
          onClick={() => mutation.mutate({ bio })}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
      </div>
      {mutation.isError && (
        <p className="mt-2 text-xs text-red-500">
          Erreur lors de la sauvegarde.
        </p>
      )}
    </div>
  );
}
