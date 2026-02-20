import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { userApi } from "../api/userApi";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const { isAuthenticated } = useAuth();

  function removeSpaces(str: string) {
    str = str.trim();
    str = str.replace(/\s+/g, " ");
    return str;
  }

  function isValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function isValidPassword(password: string) {
    return password.length >= 8;
  }

  function isTheSamePassword(pw1: string, pw2: string) {
    return pw1 === pw2;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let u = removeSpaces(username);
    let em = removeSpaces(email);

    if (!u || !em || !password || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs.");
      setErrors({
        username: !u,
        email: !em,
        password: !password,
        confirmPassword: !confirmPassword,
      });
      return;
    }
    if (!isValidEmail(em)) {
      toast.error("Veuillez entrer un email valide.");
      setErrors({ email: true });
      return;
    }
    if (!isValidPassword(password)) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      setErrors({ password: true });
      return;
    }
    if (!isTheSamePassword(password, confirmPassword)) {
      toast.error("Les mots de passe ne correspondent pas.");
      setErrors({ password: true, confirmPassword: true });
      return;
    }
    userApi
      .register(u, em, password)
      .then(() => {
        setErrors({});
        toast.success(
          "Inscription réussie. Vous pouvez maintenant vous connecter.",
        );
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        navigate("/");
      })
      .catch((error) => {
        let errorMessage = "Échec de l'inscription. Veuillez réessayer.";
        if (error.response?.status === 409) {
          if (error.response.data.detail === "Email already registered") {
            setErrors({ email: true });
            errorMessage =
              "Cet email est déjà utilisé. Veuillez en choisir un autre.";
          } else if (error.response.data.detail === "Username already taken") {
            setErrors({ username: true });
            errorMessage =
              "Ce nom d'utilisateur est déjà pris. Veuillez en choisir un autre.";
          }
        } else if (error.response?.status === 422) {
          setErrors({
            username: true,
            email: true,
            password: true,
            confirmPassword: true,
          });
          errorMessage =
            "Données invalides. Veuillez vérifier vos informations.";
        }
        toast.error(errorMessage);
      });
  }

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
      toast.error("Vous êtes connecté.", { icon: "⚠" });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Créer un compte
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="block text-sm font-bold mb-1 text-gray-700 dark:text-slate-300"
              htmlFor="username"
            >
              Nom d'utilisateur
            </label>
            <input
              id="username"
              type="text"
              className={`border ${errors.username ? "border-red-500" : "border-gray-300"} w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.username ? "focus:ring-red-500" : "focus:ring-blue-500"} focus:border-transparent transition-all duration-200`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label
              className="block text-sm font-bold  mb-1 text-gray-700 dark:text-slate-300"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`border ${errors.email ? "border-red-500" : "border-gray-300"} w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.email ? "focus:ring-red-500" : "focus:ring-blue-500"} focus:border-transparent transition-all duration-200`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              className="block text-sm font-bold mb-1 text-gray-700 dark:text-slate-300"
              htmlFor="password"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className={`border ${errors.password ? "border-red-500" : "border-gray-300"} w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.password ? "focus:ring-red-500" : "focus:ring-blue-500"} focus:border-transparent transition-all duration-200`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label
              className="block text-sm font-bold mb-1 text-gray-700 dark:text-slate-300"
              htmlFor="confirmPassword"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`border ${errors.confirmPassword ? "border-red-500" : "border-gray-300"} w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.confirmPassword ? "focus:ring-red-500" : "focus:ring-blue-500"} focus:border-transparent transition-all duration-200`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200"
          >
            S'inscrire
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
