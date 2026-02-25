import type { AxiosError } from "axios";

/**
 * Extrait un message d'erreur user-friendly en français depuis une erreur Axios.
 */
export function getApiErrorMessage(error: AxiosError): string {
  // Timeout
  if (error.code === "ECONNABORTED") {
    return "Le serveur met trop de temps à répondre. Réessayez plus tard.";
  }

  // Pas de réponse du serveur (réseau coupé, serveur down)
  if (!error.response) {
    return "Impossible de contacter le serveur. Vérifiez votre connexion.";
  }

  const status = error.response.status;
  const data = error.response.data as Record<string, unknown> | undefined;

  switch (status) {
    case 401:
      return "Session expirée. Veuillez vous reconnecter.";
    case 403:
      return "Vous n'avez pas les droits pour cette action.";
    case 404:
      return "Ressource introuvable.";
    case 409:
      return "Conflit : cette ressource existe déjà.";
    case 422: {
      // Tenter d'extraire le détail de validation FastAPI
      if (data?.detail) {
        if (typeof data.detail === "string") return data.detail;
        if (Array.isArray(data.detail)) {
          return data.detail
            .map((d: { msg?: string }) => d.msg || "")
            .filter(Boolean)
            .join(". ");
        }
      }
      return "Données invalides. Vérifiez les champs du formulaire.";
    }
    default:
      if (status >= 500) {
        return "Erreur serveur. Réessayez plus tard.";
      }
      return "Une erreur inattendue s'est produite.";
  }
}
