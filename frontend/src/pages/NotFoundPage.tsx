import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 bg-transparent">
      <img src="/favicon.svg" alt="HumanTree" className="w-16 h-16 mb-4 opacity-50" />
      <h1 className="text-6xl font-display font-bold text-gray-200 dark:text-slate-700">404</h1>
      <p className="mt-3 text-gray-500 dark:text-slate-400">
        Cette page n'existe pas.
      </p>
      <Link
        to="/"
        className="mt-6 px-5 py-2 text-sm font-display font-medium rounded-lg bg-primary-700 hover:bg-primary-800 text-white transition-colors duration-150"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}

export default NotFoundPage;
