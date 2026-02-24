import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 bg-gray-100 dark:bg-slate-900">
      <img src="/favicon.svg" alt="HumanTree" className="w-20 h-20 mb-6 opacity-60" />
      <h1 className="text-7xl font-bold text-gray-300 dark:text-slate-600">404</h1>
      <p className="mt-4 text-xl text-gray-600 dark:text-slate-400">
        Cette page n'existe pas.
      </p>
      <Link
        to="/"
        className="mt-8 px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}

export default NotFoundPage;
