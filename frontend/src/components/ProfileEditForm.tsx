import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/userApi";

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
    <div className="mt-6 p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
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
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          placeholder="Parlez de vous..."
        />
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => mutation.mutate({ bio })}
          disabled={mutation.isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Annuler
        </button>
      </div>
      {mutation.isError && (
        <p className="mt-2 text-xs text-red-500">
          Erreur lors de la sauvegarde.
        </p>
      )}
    </div>
  );
}
