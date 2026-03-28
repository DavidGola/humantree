import { useState, useEffect, createContext, useContext } from "react";
import { toast } from "react-hot-toast";
import { userApi } from "../api/userApi";
import { getApiErrorMessage } from "../utils/apiErrors";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  login: (e: React.FormEvent, mail: string, password: string) => void;
  logout: () => void;
  username: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [username, setUsername] = useState("");

  function login(e: React.FormEvent, mail: string, password: string) {
    e.preventDefault();
    setIsLoggingIn(true);
    const formData = new URLSearchParams();
    formData.append("username", mail);
    formData.append("password", password);
    userApi
      .login(formData)
      .then((response) => {
        setUsername(response.data.username);
        setIsAuthenticated(true);
        try {
          localStorage.setItem("username", response.data.username);
        } catch {
          // localStorage indisponible
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          toast.error("Identifiant ou mot de passe incorrect.");
        } else {
          toast.error(getApiErrorMessage(err));
        }
      })
      .finally(() => {
        setIsLoggingIn(false);
      });
  }

  function logout() {
    userApi.logout().catch(() => {});
    try {
      localStorage.removeItem("username");
    } catch {
      // localStorage indisponible
    }
    setUsername("");
    setIsAuthenticated(false);
    toast.success("Déconnexion réussie.");
  }

  // Au chargement, vérifier la session via /me/profile
  useEffect(() => {
    let storedUsername: string | null = null;
    try {
      storedUsername = localStorage.getItem("username");
    } catch {
      return;
    }
    if (storedUsername) {
      userApi
        .getProfile()
        .then((user) => {
          setUsername(user.username);
          setIsAuthenticated(true);
          try {
            localStorage.setItem("username", user.username);
          } catch { /* localStorage peut échouer en navigation privée */ }
        })
        .catch(() => {
          try {
            localStorage.removeItem("username");
          } catch { /* localStorage peut échouer en navigation privée */ }
        });
    }
  }, []);

  // Logout automatique quand le refresh token échoue (intercepteur Axios)
  useEffect(() => {
    const handleForceLogout = () => {
      try {
        localStorage.removeItem("username");
      } catch { /* localStorage peut échouer en navigation privée */ }
      setUsername("");
      setIsAuthenticated(false);
      toast.error("Session expirée. Veuillez vous reconnecter.");
    };
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoggingIn, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
