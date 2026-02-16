import type { User } from "../types/user";
import { useState, useEffect } from "react";
import axiosInst from "../api/client";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, username: authUsername } = useAuth();
  const isOwnProfile = isAuthenticated && authUsername === username;

  useEffect(() => {
    setLoading(true);
    if (isOwnProfile) {
      axiosInst
        .get<User>("/users/me/profile")
        .then((response) => {
          setUser(response.data);
        })
        .catch((error) => {
          console.error("Erreur:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      axiosInst
        .get<User>(`/users/${username}/`)
        .then((response) => {
          setUser(response.data);
        })
        .catch((error) => {
          console.error("Erreur:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOwnProfile, username]);

  /* Format a datetime string into a readable date */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  /* Extract the first letter of the username for the avatar */
  const avatarLetter = user?.username?.charAt(0).toUpperCase() ?? "?";

  /* Loading state */
  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Chargement du profil...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* Error / not found state */
  if (!user) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Utilisateur introuvable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header: avatar + username */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-white select-none">
              {avatarLetter}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {user.username}
            </h1>
            {isOwnProfile && user.email && (
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {user.email}
              </p>
            )}
            {isOwnProfile && user.created_at && (
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Membre depuis le {formatDate(user.created_at)}
              </p>
            )}
            {!isOwnProfile && (
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Profil public
              </p>
            )}
          </div>
        </div>

        {/* Own profile: account info section */}
        {isOwnProfile && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4">
              Informations du compte
            </h2>

            <div className="border-t border-gray-200 dark:border-slate-700">
              <dl className="divide-y divide-gray-200 dark:divide-slate-700">
                <div className="flex items-center justify-between py-4">
                  <dt className="text-sm text-gray-500 dark:text-slate-400">
                    Nom d'utilisateur
                  </dt>
                  <dd className="text-sm font-medium text-gray-800 dark:text-white">
                    {user.username}
                  </dd>
                </div>

                {user.email && (
                  <div className="flex items-center justify-between py-4">
                    <dt className="text-sm text-gray-500 dark:text-slate-400">
                      Email
                    </dt>
                    <dd className="text-sm font-medium text-gray-800 dark:text-white">
                      {user.email}
                    </dd>
                  </div>
                )}

                {user.created_at && (
                  <div className="flex items-center justify-between py-4">
                    <dt className="text-sm text-gray-500 dark:text-slate-400">
                      Inscription
                    </dt>
                    <dd className="text-sm font-medium text-gray-800 dark:text-white">
                      {formatDate(user.created_at)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Placeholder for future "edit profile" button */}
            <div className="mt-8">
              <button
                disabled
                className="py-2.5 px-6 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700/50 cursor-not-allowed transition-colors duration-200"
              >
                Modifier le profil (bientot disponible)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfilePage;
