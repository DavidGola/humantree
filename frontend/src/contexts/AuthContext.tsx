import { useState, useEffect, createContext, useContext } from "react";
import axiosInst from "../api/client";
import { toast } from "react-hot-toast";

const AuthContext = createContext({
  isAuthenticated: false,
  login: (e: React.FormEvent, mail: string, password: string) => {},
  logout: () => {},
  username: "",
});

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  function login(e: React.FormEvent, mail: string, password: string) {
    e.preventDefault();
    const formData = new URLSearchParams();
    formData.append("username", mail);
    formData.append("password", password);
    axiosInst
      .post("/users/login/", formData)
      .then((response) => {
        localStorage.setItem("token", response.data.access_token);
        localStorage.setItem("username", response.data.username);
        setUsername(response.data.username);
        setIsAuthenticated(true);
      })
      .catch((error) => {
        toast.error(
          "Échec de la connexion. Vérifiez votre identifiant ou mot de passe.",
        );
        console.error("Login failed:", error);
      });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUsername("");
    setIsAuthenticated(false);
    toast.success("Déconnexion réussie.");
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    if (token && storedUsername && !isJWTExpired(token)) {
      setUsername(storedUsername);
      setIsAuthenticated(true);
    }
  }, []);

  function isJWTExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp;
      const currentTime = Math.floor(Date.now() / 1000);
      return exp < currentTime;
    } catch (error) {
      console.error("Invalid token:", error);
      return true; // Considérer le token comme expiré en cas d'erreur
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
