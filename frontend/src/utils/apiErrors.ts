import type { AxiosError } from "axios";

/**
 * Extrait un message d'erreur user-friendly en français depuis une erreur Axios.
 */
export function getApiErrorMessage(err: unknown): string {
  if (!(err instanceof Error && "isAxiosError" in err)) {
    return "Une erreur inattendue s'est produite.";
  }
  const error = err as AxiosError;
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
  const detail =
    typeof data?.detail === "string" ? data.detail : null;

  switch (status) {
    case 400:
      return detail || "Requête invalide.";
    case 401:
      return "Session expirée. Veuillez vous reconnecter.";
    case 403:
      return "Vous n'avez pas les droits pour cette action.";
    case 404:
      return detail || "Ressource introuvable.";
    case 409:
      return detail || "Conflit : cette ressource existe déjà.";
    case 422: {
      // Tenter d'extraire le détail de validation FastAPI
      if (detail) return detail;
      if (Array.isArray(data?.detail)) {
        return (data.detail as Array<{ msg?: string }>)
          .map((d) => d.msg || "")
          .filter(Boolean)
          .join(". ");
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

/**
 * Extrait le champ `detail` brut (string) d'une erreur Axios, ou null.
 * Utile pour les composants qui branchent sur le contenu exact du detail.
 */
export function getApiErrorDetail(error: AxiosError): string | null {
  const data = error.response?.data as Record<string, unknown> | undefined;
  return typeof data?.detail === "string" ? data.detail : null;
}
