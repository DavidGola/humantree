import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HelpModal } from "./HelpModal";

export const Navbar = () => {
  const { isAuthenticated, isLoggingIn, username, login, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [mail_or_username, setMailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("has_seen_help")) {
      setHelpOpen(true);
    }
  }, []);

  const closeHelp = () => {
    setHelpOpen(false);
    localStorage.setItem("has_seen_help", "true");
  };

  return (<>
    <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 transition-colors duration-200">
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white tracking-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
        >
          <img src="/favicon.svg" alt="HumanTree" className="w-7 h-7" />
          HumanTree
        </a>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/")}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            Arbres
          </button>
          <button
            onClick={() => navigate("/search")}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            Recherche
          </button>
        </div>

        {/* Right side: auth UI + dark mode toggle */}
        <div className="flex items-center gap-3">
          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!mail_or_username.trim() || !password.trim()) {
                    toast.error("Veuillez remplir tous les champs.");
                    return;
                  }
                  login(e, mail_or_username, password);
                }}
              >
                <input
                  type="text"
                  placeholder="Email ou nom d'utilisateur"
                  className="w-44 py-1.5 px-3 text-sm rounded-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={mail_or_username}
                  onChange={(e) => setMailOrUsername(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  className="w-44 py-1.5 px-3 text-sm rounded-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="whitespace-nowrap py-1.5 px-4 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? "Connexion..." : "Se connecter"}
                </button>
              </form>
              <a
                href="/register"
                className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
              >
                S'inscrire
              </a>
            </div>
          )}

          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
                onClick={() => navigate(`/user/${username}`)}
              >
                {username}
              </span>
              <button
                onClick={logout}
                className="py-1.5 px-3 text-sm font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-300 dark:border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200"
              >
                Se déconnecter
              </button>
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-yellow-300 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-sm transition-all duration-200"
          >
            {isDarkMode ? "☀" : "🌙"}
          </button>

          {/* Help button */}
          <button
            onClick={() => setHelpOpen(true)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-sm font-bold transition-all duration-200"
          >
            ?
          </button>
        </div>
      </div>
    </nav>

    {helpOpen && <HelpModal onClose={closeHelp} />}
  </>
  );
};
