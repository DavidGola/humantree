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
    const u = removeSpaces(username);
    const em = removeSpaces(email);

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
    if (u.length < 3 || u.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(u)) {
      toast.error("Le nom d'utilisateur doit faire 3-30 caractères (lettres, chiffres, - et _).");
      setErrors({ username: true });
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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 flex-col items-center justify-center p-12">
        <img src="/favicon.svg" alt="HumanTree" className="w-20 h-20 mb-6" />
        <h1 className="text-3xl font-display font-bold text-white mb-3">
          HumanTree
        </h1>
        <p className="text-primary-200 text-center max-w-xs leading-relaxed">
          Visualisez vos compétences sous forme d'arbres interactifs et suivez votre progression.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src="/favicon.svg" alt="HumanTree" className="w-8 h-8" />
            <span className="text-xl font-display font-bold text-gray-800 dark:text-white">HumanTree</span>
          </div>

          <h2 className="text-2xl font-display font-bold mb-6 text-gray-900 dark:text-white">
            Créer un compte
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
                htmlFor="username"
              >
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                className={`w-full px-3 py-2 rounded-lg surface-input text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-colors duration-150 ${errors.username ? "!border-red-500" : ""}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`w-full px-3 py-2 rounded-lg surface-input text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-colors duration-150 ${errors.email ? "!border-red-500" : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
                htmlFor="password"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                className={`w-full px-3 py-2 rounded-lg surface-input text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-colors duration-150 ${errors.password ? "!border-red-500" : ""}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
                htmlFor="confirmPassword"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`w-full px-3 py-2 rounded-lg surface-input text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-colors duration-150 ${errors.confirmPassword ? "!border-red-500" : ""}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-primary-700 hover:bg-primary-800 text-white font-display font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 transition-colors duration-150"
            >
              S'inscrire
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
