import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { skillTreeApi } from "../api/skillTreeApi";
import ProfileEditForm from "../components/ProfileEditForm";
import ApiKeySettings from "../components/ApiKeySettings";
import type { User, UserPublic } from "../types/user";

type ProfileTab = "profile" | "settings";

function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { isAuthenticated, username: authUsername } = useAuth();
  const isOwnProfile = isAuthenticated && authUsername === username;
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

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
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 dark:text-slate-500">
              Chargement du profil...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-sm text-gray-400 dark:text-slate-500">
            Utilisateur introuvable.
          </p>
        </div>
      </div>
    );
  }

  const treesCount = isOwnProfile
    ? (trees?.length ?? 0)
    : (publicUser as UserPublic)?.trees_count ?? 0;
  const skillsCount = isOwnProfile
    ? (ownUser as User)?.skills_checked_count ?? 0
    : (publicUser as UserPublic)?.skills_checked_count ?? 0;

  const tabClasses = (tab: ProfileTab) =>
    `px-4 py-3 text-sm font-display font-medium transition-colors duration-150 border-b-2 -mb-px ${
      activeTab === tab
        ? "text-primary-700 dark:text-primary-400 border-primary-700 dark:border-primary-400"
        : "text-gray-400 dark:text-slate-500 border-transparent hover:text-gray-600 dark:hover:text-slate-300"
    }`;

  return (
    <div className="min-h-screen">
      <div className="bg-primary-700 dark:bg-primary-900 pt-12 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center border-4 border-primary-500">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-display font-bold text-white select-none">
                  {avatarLetter}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-xl font-display font-bold text-white">
              {profile.username}
            </h1>
            {profile.bio && (
              <p className="mt-1 text-sm text-primary-200 text-center max-w-md">
                {profile.bio}
              </p>
            )}
            <div className="mt-4 flex items-center gap-6 text-sm text-primary-200">
              <span>{treesCount} arbre{treesCount !== 1 ? "s" : ""}</span>
              <span className="w-1 h-1 rounded-full bg-primary-400" />
              <span>{skillsCount} skill{skillsCount !== 1 ? "s" : ""} acquis</span>
              {profile.created_at && (
                <>
                  <span className="w-1 h-1 rounded-full bg-primary-400 hidden sm:block" />
                  <span className="hidden sm:inline">Membre depuis {formatDate(profile.created_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-6">
        {isOwnProfile && (
          <nav className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--border-subtle)' }}>
            <button className={tabClasses("profile")} onClick={() => setActiveTab("profile")}>
              Profil
            </button>
            <button className={tabClasses("settings")} onClick={() => setActiveTab("settings")}>
              Paramètres
            </button>
          </nav>
        )}

        {activeTab === "profile" && (
          <>
            {isOwnProfile && !editing && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 text-sm font-display font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-150"
                >
                  Modifier le profil
                </button>
              </div>
            )}

            {isOwnProfile && editing && (
              <div className="mb-6">
                <ProfileEditForm
                  currentBio={(ownUser as User)?.bio ?? ""}
                  onClose={() => setEditing(false)}
                />
              </div>
            )}

            {trees && trees.length > 0 ? (
              <div>
                <h2 className="text-xs font-display font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
                  Arbres créés
                </h2>
                <div className="space-y-2">
                  {trees.map((tree) => (
                    <Link
                      key={tree.id}
                      to={`/tree/${tree.id}`}
                      className="group flex items-center gap-4 px-4 py-3 rounded-lg border-l-2 border-l-primary-500 surface-card transition-colors duration-150"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-display font-semibold text-gray-800 dark:text-white truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                          {tree.name}
                        </h3>
                        {tree.description && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                            {tree.description}
                          </p>
                        )}
                      </div>
                      {tree.tags && tree.tags.length > 0 && (
                        <div className="flex gap-1 shrink-0">
                          {tree.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-[10px] font-medium rounded border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 dark:text-slate-500">Aucun arbre créé pour l'instant.</p>
              </div>
            )}
          </>
        )}

        {activeTab === "settings" && isOwnProfile && (
          <div>
            {!editing && (
              <div className="mb-6">
                <h2 className="text-xs font-display font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
                  Profil
                </h2>
                <button
                  onClick={() => { setEditing(true); setActiveTab("profile"); }}
                  className="px-4 py-2 text-sm font-display font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-150"
                >
                  Modifier le profil
                </button>
              </div>
            )}
            <ApiKeySettings />
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfilePage;
