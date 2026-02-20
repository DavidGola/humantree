import { useState, useEffect, createContext, useContext } from "react";
import { toast } from "react-hot-toast";
import { userApi } from "../api/userApi";

const AuthContext = createContext({
  isAuthenticated: false,
  login: (_e: React.FormEvent, _mail: string, _password: string) => {},
  logout: () => {},
  username: "",
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  function login(e: React.FormEvent, mail: string, password: string) {
    e.preventDefault();
    const formData = new URLSearchParams();
    formData.append("username", mail);
    formData.append("password", password);
    userApi
      .login(formData)
      .then((response) => {
        try {
          localStorage.setItem("token", response.data.access_token);
          localStorage.setItem("username", response.data.username);
        } catch {
          // localStorage indisponible
        }
        setUsername(response.data.username);
        setIsAuthenticated(true);
      })
      .catch(() => {
        toast.error(
          "Échec de la connexion. Vérifiez votre identifiant ou mot de passe.",
        );
      });
  }

  function logout() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
    } catch {
      // localStorage indisponible
    }
    setUsername("");
    setIsAuthenticated(false);
    toast.success("Déconnexion réussie.");
  }

  useEffect(() => {
    let token: string | null = null;
    let storedUsername: string | null = null;
    try {
      token = localStorage.getItem("token");
      storedUsername = localStorage.getItem("username");
    } catch {
      return;
    }
    if (token && storedUsername && !isJWTExpired(token)) {
      setUsername(storedUsername);
      setIsAuthenticated(true);
    } else if (token && isJWTExpired(token)) {
      userApi
        .refresh()
        .then((response) => {
          try {
            localStorage.setItem("token", response.data.access_token);
            localStorage.setItem("username", response.data.username);
          } catch {
            // localStorage indisponible
          }
          setUsername(response.data.username);
          setIsAuthenticated(true);
        })
        .catch(() => {
          try {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
          } catch {
            // localStorage indisponible
          }
        });
    }
  }, []);

  function isJWTExpired(token: string): boolean {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      const currentTime = Math.floor(Date.now() / 1000);
      return exp < currentTime;
    } catch {
      return true; // Considérer le token comme expiré en cas d'erreur
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
