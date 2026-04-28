import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { HelpModal } from "./HelpModal";
import { Modal } from "./Modal";

export const Navbar = () => {
  const { isAuthenticated, isLoggingIn, username, login, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [helpOpen, setHelpOpen] = useState(() => !localStorage.getItem("has_seen_help"));
  const [loginOpen, setLoginOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mailOrUsername, setMailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAuthenticated && loginOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoginOpen(false);
      setMailOrUsername("");
      setPassword("");
    }
  }, [isAuthenticated, loginOpen]);

  const closeHelp = () => {
    setHelpOpen(false);
    localStorage.setItem("has_seen_help", "true");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailOrUsername.trim() || !password.trim()) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    login(e, mailOrUsername, password);
  };

  const avatarLetter = username?.charAt(0).toUpperCase() ?? "?";

  const navLinkClass = (path: string) =>
    `px-2 py-1 text-sm font-display font-medium transition-colors duration-150 ${
      location.pathname === path
        ? "text-primary-700 dark:text-primary-400"
        : "text-gray-500 dark:text-slate-400 hover:text-primary-700 dark:hover:text-primary-400"
    }`;

  return (<>
    <nav className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="container mx-auto flex items-center justify-between px-6 py-2.5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-lg font-display font-bold text-gray-800 dark:text-white tracking-tight hover:text-primary-700 dark:hover:text-primary-400 transition-colors duration-150 shrink-0"
        >
          <img src="/favicon.svg" alt="HumanTree" className="w-6 h-6" />
          <span className="hidden sm:inline">HumanTree</span>
        </button>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className={navLinkClass("/")}>
            Arbres
          </button>
          <button onClick={() => navigate("/search")} className={navLinkClass("/search")}>
            Recherche
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 flex items-center justify-center text-sm text-gray-500 dark:text-slate-400 hover:text-primary-700 dark:hover:text-primary-400 transition-colors duration-150"
          >
            {isDarkMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoginOpen(true)}
                className="px-3 py-1.5 text-sm font-display font-medium text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-150"
              >
                Se connecter
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-3 py-1.5 text-sm font-display font-semibold rounded-lg bg-primary-700 hover:bg-primary-800 text-white transition-colors duration-150"
              >
                S'inscrire
              </button>
            </div>
          )}

          {isAuthenticated && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-8 h-8 rounded-full bg-primary-700 text-white font-display font-bold text-sm flex items-center justify-center hover:bg-primary-800 transition-colors duration-150"
              >
                {avatarLetter}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg surface-strong py-1 z-[100]">
                  <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <p className="text-sm font-display font-medium text-gray-800 dark:text-white truncate">{username}</p>
                  </div>
                  <button
                    onClick={() => { navigate(`/user/${username}`); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                  >
                    Mon profil
                  </button>
                  <button
                    onClick={() => { setHelpOpen(true); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                  >
                    Aide
                  </button>
                  <div className="border-t mt-1" style={{ borderColor: 'var(--border-subtle)' }}>
                    <button
                      onClick={() => { logout(); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>

    {loginOpen && (
      <Modal title="Se connecter" onClose={() => setLoginOpen(false)}>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300" htmlFor="login-email">
              Email ou nom d'utilisateur
            </label>
            <input
              id="login-email"
              type="text"
              className="w-full py-2 px-3 text-sm rounded-lg surface-input text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-colors duration-150"
              value={mailOrUsername}
              onChange={(e) => setMailOrUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300" htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              className="w-full py-2 px-3 text-sm rounded-lg surface-input text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-colors duration-150"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2 text-sm font-display font-semibold rounded-lg bg-primary-700 hover:bg-primary-800 text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "Connexion..." : "Se connecter"}
          </button>
          <p className="text-center text-sm text-gray-500 dark:text-slate-400">
            Pas encore de compte ?{" "}
            <button
              type="button"
              onClick={() => { setLoginOpen(false); navigate("/register"); }}
              className="text-primary-700 dark:text-primary-400 hover:underline font-medium"
            >
              S'inscrire
            </button>
          </p>
        </form>
      </Modal>
    )}

    {helpOpen && <HelpModal onClose={closeHelp} />}
  </>
  );
};
