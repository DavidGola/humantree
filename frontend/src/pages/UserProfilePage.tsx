import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { skillTreeApi } from "../api/skillTreeApi";
import ProfileEditForm from "../components/ProfileEditForm";
import ApiKeySettings from "../components/ApiKeySettings";
import type { User, UserPublic } from "../types/user";

function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { isAuthenticated, username: authUsername } = useAuth();
  const isOwnProfile = isAuthenticated && authUsername === username;
  const [editing, setEditing] = useState(false);

  const { data: ownUser, isLoading: loadingOwn } = useQuery({
    queryKey: ["user", username, "own"],
    queryFn: () => userApi.getProfile(),
    enabled: isOwnProfile,
  });

  const { data: publicUser, isLoading: loadingPublic } = useQuery({
    queryKey: ["user", username, "public"],
    queryFn: () => userApi.getByUsername(username!),
    enabled: !isOwnProfile && !!username,
  });

  const { data: trees } = useQuery({
    queryKey: ["user-trees", username],
    queryFn: () => skillTreeApi.getByUsername(username!),
    enabled: !!username,
  });

  const loading = isOwnProfile ? loadingOwn : loadingPublic;

  // Merge data for display
  const profile: {
    username: string;
    bio: string | null;
    avatar_url: string | null;
    created_at: string | null;
    email?: string | null;
    trees_count?: number;
    skills_checked_count?: number;
  } | null = isOwnProfile
    ? ownUser
      ? {
          ...ownUser,
          trees_count: trees?.length ?? 0,
        }
      : null
    : publicUser ?? null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "?";

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

  if (!profile) {
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

  const statsItems = [
    {
      label: "Arbres créés",
      value: isOwnProfile
        ? (trees?.length ?? 0)
        : (publicUser as UserPublic)?.trees_count ?? 0,
    },
    {
      label: "Skills acquis",
      value: (publicUser as UserPublic)?.skills_checked_count ?? 0,
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header: avatar + username + bio */}
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white select-none">
                {avatarLetter}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {profile.username}
            </h1>
            {profile.bio && (
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                {profile.bio}
              </p>
            )}
            {isOwnProfile && (ownUser as User)?.email && (
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {(ownUser as User).email}
              </p>
            )}
            {profile.created_at && (
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Membre depuis le {formatDate(profile.created_at)}
              </p>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {statsItems.map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50"
            >
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Edit profile */}
        {isOwnProfile && !editing && (
          <div className="mt-6">
            <button
              onClick={() => setEditing(true)}
              className="py-2.5 px-6 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
            >
              Modifier le profil
            </button>
          </div>
        )}

        {isOwnProfile && editing && (
          <ProfileEditForm
            currentBio={(ownUser as User)?.bio ?? ""}
            onClose={() => setEditing(false)}
          />
        )}

        {/* API Key Settings (own profile only) */}
        {isOwnProfile && <ApiKeySettings />}

        {/* User's trees */}
        {trees && trees.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4">
              Arbres créés
            </h2>
            <div className="space-y-3">
              {trees.map((tree) => (
                <Link
                  key={tree.id}
                  to={`/tree/${tree.id}`}
                  className="block p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <h3 className="text-sm font-medium text-gray-800 dark:text-white">
                    {tree.name}
                  </h3>
                  {tree.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {tree.description}
                    </p>
                  )}
                  {tree.tags && tree.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {tree.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfilePage;
