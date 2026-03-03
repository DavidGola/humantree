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
      <div className="p-8 min-h-screen bg-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
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
      <div className="p-8 min-h-screen bg-transparent">
        <div className="max-w-4xl mx-auto">
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
      icon: (
        <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
        </svg>
      ),
    },
    {
      label: "Skills acquis",
      value: isOwnProfile
        ? (ownUser as User)?.skills_checked_count ?? 0
        : (publicUser as UserPublic)?.skills_checked_count ?? 0,
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const tabClasses = (tab: ProfileTab) =>
    `px-6 py-3 text-sm font-display font-semibold transition-all duration-200 relative ${
      activeTab === tab
        ? "text-primary-600 dark:text-primary-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400"
        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
    }`;

  return (
    <div className="p-8 min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto">
        {/* Two-column layout on desktop */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left column: Avatar + info + stats */}
          <div className="lg:w-80 shrink-0">
            <div className="flex flex-col items-center lg:items-start">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-display font-bold text-white select-none">
                    {avatarLetter}
                  </span>
                )}
              </div>

              {/* Username + bio */}
              <h1 className="mt-4 text-2xl font-display font-bold text-gray-800 dark:text-white">
                {profile.username}
              </h1>
              {profile.bio && (
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 text-center lg:text-left">
                  {profile.bio}
                </p>
              )}
              {isOwnProfile && (ownUser as User)?.email && (
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {(ownUser as User).email}
                </p>
              )}
              {profile.created_at && (
                <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                  Membre depuis le {formatDate(profile.created_at)}
                </p>
              )}

              {/* Stats */}
              <div className="mt-6 w-full space-y-3">
                {statsItems.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 p-3 rounded-xl surface-card"
                  >
                    {stat.icon}
                    <div>
                      <p className="text-xl font-display font-bold text-gray-800 dark:text-white">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                ))}
                {statsItems.every(s => s.value === 0) && (
                  <p className="text-sm text-primary-500 dark:text-primary-400 text-center mt-2">
                    Commencez votre premier arbre !
                  </p>
                )}
              </div>

              {/* Edit profile button */}
              {isOwnProfile && !editing && activeTab === "profile" && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-4 w-full py-2.5 text-sm font-display font-semibold rounded-lg border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200"
                >
                  Modifier le profil
                </button>
              )}
            </div>
          </div>

          {/* Right column: Tabs + content */}
          <div className="flex-1 min-w-0">
            {/* Tabs (only for own profile) */}
            {isOwnProfile && (
              <nav className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
                <button className={tabClasses("profile")} onClick={() => setActiveTab("profile")}>
                  Profil
                </button>
                <button className={tabClasses("settings")} onClick={() => setActiveTab("settings")}>
                  Paramètres
                </button>
              </nav>
            )}

            {/* Profile tab content */}
            {activeTab === "profile" && (
              <>
                {isOwnProfile && editing && (
                  <div className="mb-6">
                    <ProfileEditForm
                      currentBio={(ownUser as User)?.bio ?? ""}
                      onClose={() => setEditing(false)}
                    />
                  </div>
                )}

                {/* User's trees */}
                {trees && trees.length > 0 ? (
                  <div>
                    <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4">
                      Arbres créés
                    </h2>
                    <div className="space-y-2">
                      {trees.map((tree) => (
                        <Link
                          key={tree.id}
                          to={`/tree/${tree.id}`}
                          className="group flex items-stretch rounded-xl overflow-hidden surface-card hover:-translate-y-0.5 transition-all duration-300"
                        >
                          <div className="w-1 shrink-0 bg-gradient-to-b from-primary-400 to-primary-600 group-hover:w-1.5 transition-all duration-300" />
                          <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-display font-semibold text-gray-800 dark:text-white truncate">
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
                                    className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary-100/60 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
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

            {/* Settings tab content */}
            {activeTab === "settings" && isOwnProfile && (
              <div>
                {!editing && (
                  <div className="mb-6">
                    <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4">
                      Profil
                    </h2>
                    <button
                      onClick={() => { setEditing(true); setActiveTab("profile"); }}
                      className="py-2.5 px-6 text-sm font-display font-semibold rounded-lg border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200"
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
      </div>
    </div>
  );
}

export default UserProfilePage;
