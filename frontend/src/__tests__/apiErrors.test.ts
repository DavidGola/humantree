import { describe, it, expect } from "vitest";
import { AxiosError } from "axios";
import { getApiErrorMessage, getApiErrorDetail } from "../utils/apiErrors";

function makeAxiosError(
  status?: number,
  data?: Record<string, unknown>,
  code?: string,
): AxiosError {
  const error = new AxiosError();
  if (code) error.code = code;
  if (status !== undefined) {
    error.response = {
      status,
      data: data || {},
      headers: {},
      statusText: "",
      config: {} as never,
    };
  }
  return error;
}

describe("getApiErrorMessage", () => {
  it("retourne un message réseau quand pas de response", () => {
    const error = makeAxiosError();
    expect(getApiErrorMessage(error)).toBe(
      "Impossible de contacter le serveur. Vérifiez votre connexion.",
    );
  });

  it("retourne un message timeout", () => {
    const error = makeAxiosError(undefined, undefined, "ECONNABORTED");
    expect(getApiErrorMessage(error)).toBe(
      "Le serveur met trop de temps à répondre. Réessayez plus tard.",
    );
  });

  it("retourne un message 400 sans detail", () => {
    const error = makeAxiosError(400);
    expect(getApiErrorMessage(error)).toBe("Requête invalide.");
  });

  it("retourne le detail du backend pour 400", () => {
    const error = makeAxiosError(400, {
      detail: "Le nom ne peut pas être vide.",
    });
    expect(getApiErrorMessage(error)).toBe("Le nom ne peut pas être vide.");
  });

  it("retourne un message 401", () => {
    const error = makeAxiosError(401);
    expect(getApiErrorMessage(error)).toBe(
      "Session expirée. Veuillez vous reconnecter.",
    );
  });

  it("retourne un message 403", () => {
    const error = makeAxiosError(403);
    expect(getApiErrorMessage(error)).toBe(
      "Vous n'avez pas les droits pour cette action.",
    );
  });

  it("retourne un message 404 sans detail", () => {
    const error = makeAxiosError(404);
    expect(getApiErrorMessage(error)).toBe("Ressource introuvable.");
  });

  it("retourne le detail du backend pour 404", () => {
    const error = makeAxiosError(404, {
      detail: "Arbre de compétences introuvable.",
    });
    expect(getApiErrorMessage(error)).toBe(
      "Arbre de compétences introuvable.",
    );
  });

  it("retourne un message 409 sans detail", () => {
    const error = makeAxiosError(409);
    expect(getApiErrorMessage(error)).toBe(
      "Conflit : cette ressource existe déjà.",
    );
  });

  it("retourne le detail du backend pour 409", () => {
    const error = makeAxiosError(409, {
      detail: "Un arbre avec ce nom existe déjà.",
    });
    expect(getApiErrorMessage(error)).toBe(
      "Un arbre avec ce nom existe déjà.",
    );
  });

  it("retourne le détail string pour 422", () => {
    const error = makeAxiosError(422, { detail: "Email déjà utilisé" });
    expect(getApiErrorMessage(error)).toBe("Email déjà utilisé");
  });

  it("retourne les messages de validation FastAPI pour 422", () => {
    const error = makeAxiosError(422, {
      detail: [
        { msg: "field required", loc: ["body", "name"] },
        { msg: "invalid email", loc: ["body", "email"] },
      ],
    });
    expect(getApiErrorMessage(error)).toBe("field required. invalid email");
  });

  it("retourne un message par défaut pour 422 sans détail", () => {
    const error = makeAxiosError(422);
    expect(getApiErrorMessage(error)).toBe(
      "Données invalides. Vérifiez les champs du formulaire.",
    );
  });

  it("retourne un message serveur pour 500", () => {
    const error = makeAxiosError(500);
    expect(getApiErrorMessage(error)).toBe(
      "Erreur serveur. Réessayez plus tard.",
    );
  });

  it("retourne un message serveur pour 503", () => {
    const error = makeAxiosError(503);
    expect(getApiErrorMessage(error)).toBe(
      "Erreur serveur. Réessayez plus tard.",
    );
  });

  it("retourne un message par défaut pour un code inconnu", () => {
    const error = makeAxiosError(418);
    expect(getApiErrorMessage(error)).toBe(
      "Une erreur inattendue s'est produite.",
    );
  });
});

describe("getApiErrorDetail", () => {
  it("retourne le detail string", () => {
    const error = makeAxiosError(409, {
      detail: "Un arbre avec ce nom existe déjà.",
    });
    expect(getApiErrorDetail(error)).toBe(
      "Un arbre avec ce nom existe déjà.",
    );
  });

  it("retourne null quand pas de response", () => {
    const error = makeAxiosError();
    expect(getApiErrorDetail(error)).toBeNull();
  });

  it("retourne null quand detail est un tableau", () => {
    const error = makeAxiosError(422, {
      detail: [{ msg: "field required" }],
    });
    expect(getApiErrorDetail(error)).toBeNull();
  });

  it("retourne null quand pas de detail", () => {
    const error = makeAxiosError(400);
    expect(getApiErrorDetail(error)).toBeNull();
  });
});
