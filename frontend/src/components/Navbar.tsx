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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close login modal on successful auth
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
    `px-3 py-1.5 text-sm font-display font-semibold transition-colors duration-200 border-b-2 ${
      location.pathname === path
        ? "text-primary-600 dark:text-primary-400 border-primary-500"
        : "text-gray-600 dark:text-slate-300 border-transparent hover:text-primary-600 dark:hover:text-primary-400"
    }`;

  return (<>
    <nav className="relative z-50 backdrop-blur-md transition-colors duration-200" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xl font-display font-bold text-gray-800 dark:text-white tracking-tight hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 shrink-0"
        >
          <img src="/favicon.svg" alt="HumanTree" className="w-7 h-7" />
          <span className="hidden sm:inline">HumanTree</span>
        </button>

        {/* Navigation links */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/")} className={navLinkClass("/")}>
            Arbres
          </button>
          <button onClick={() => navigate("/search")} className={navLinkClass("/search")}>
            Recherche
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-9 h-9 rounded-full text-gray-600 dark:text-yellow-300 flex items-center justify-center text-sm transition-all duration-200" style={{ backgroundColor: 'var(--surface-hover)' }}
          >
            {isDarkMode ? "☀" : "🌙"}
          </button>

          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoginOpen(true)}
                className="px-4 py-2 text-sm font-display font-semibold rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200"
              >
                Se connecter
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-4 py-2 text-sm font-display font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors duration-200"
              >
                S'inscrire
              </button>
            </div>
          )}

          {isAuthenticated && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white font-display font-bold text-sm flex items-center justify-center hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200"
              >
                {avatarLetter}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl surface-strong backdrop-blur-md py-1 z-[100] animate-fade-in-up">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-sm font-display font-semibold text-gray-800 dark:text-white truncate">{username}</p>
                  </div>
                  <button
                    onClick={() => { navigate(`/user/${username}`); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                  >
                    Mon profil
                  </button>
                  <button
                    onClick={() => { setHelpOpen(true); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                  >
                    Aide
                  </button>
                  <div className="border-t border-gray-100 dark:border-slate-700 mt-1">
                    <button
                      onClick={() => { logout(); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

    {/* Login modal */}
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
              className="w-full py-2.5 px-3 text-sm rounded-lg surface-input text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
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
              className="w-full py-2.5 px-3 text-sm rounded-lg surface-input text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 text-sm font-display font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "Connexion..." : "Se connecter"}
          </button>
          <p className="text-center text-sm text-gray-500 dark:text-slate-400">
            Pas encore de compte ?{" "}
            <button
              type="button"
              onClick={() => { setLoginOpen(false); navigate("/register"); }}
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
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
