// Accès HTTP centralisé : toute requête vers le backend passe par ce fichier.
// Les composants n'appellent jamais fetch directement.

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

// Erreur renvoyée à l'interface : un message français, et le code HTTP (0 si le serveur ne répond pas).
export class ErreurApi extends Error {
  constructor(message, statut) {
    super(message);
    this.name = "ErreurApi";
    this.statut = statut;
  }
}

// Traduction des types d'erreur de validation renvoyés par Pydantic (FastAPI).
const MESSAGES_PAR_TYPE = {
  missing: "Champ obligatoire.",
  extra_forbidden: "Champ non autorisé.",
  int_parsing: "Nombre entier attendu.",
  int_type: "Nombre entier attendu.",
  enum: "Valeur non autorisée.",
  string_too_short: "Texte trop court.",
  string_too_long: "Texte trop long.",
  string_pattern_mismatch: "Format invalide.",
  date_parsing: "Date invalide, format attendu AAAA-MM-JJ.",
  date_from_datetime_parsing: "Date invalide, format attendu AAAA-MM-JJ.",
};

// Une erreur de validation : {type, loc, msg}. Le champ vient de loc (par exemple ["body", "montant"]).
function messageDeChamp(erreur) {
  const dernier = erreur.loc?.at(-1);
  const champ = typeof dernier === "string" && dernier !== "body" ? dernier : null;

  // Les validateurs du backend écrivent "Value error, <message>" : on garde le message français seul.
  const texte =
    erreur.type === "value_error"
      ? erreur.msg.replace(/^Value error, /, "")
      : (MESSAGES_PAR_TYPE[erreur.type] ?? "Donnée invalide.");

  return champ ? `${champ} : ${texte}` : texte;
}

// Le backend renvoie soit {"detail": "texte"} (règle métier), soit une liste (erreur de validation 422).
export function messageDepuisDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map(messageDeChamp).join(" ");
  }
  return "Une erreur inattendue est survenue.";
}

// Envoie une requête JSON. Renvoie les données décodées, ou lève ErreurApi.
export async function requete(chemin, { methode = "GET", corps } = {}) {
  const options = { method: methode, headers: {} };
  if (corps !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(corps); // montants envoyés en texte : jamais de nombre JSON
  }

  let reponse;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, options);
  } catch {
    // Pas de réponse lisible : backend arrêté, adresse incorrecte, ou erreur interne du serveur.
    // Une erreur 500 n'a pas les en-têtes CORS : le navigateur la présente donc comme une panne réseau.
    throw new ErreurApi(
      `Le serveur ne répond pas (${API_URL}). Vérifiez que le backend est démarré et consultez son terminal.`,
      0,
    );
  }

  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const message =
      reponse.status >= 500
        ? "Erreur interne du serveur. Consultez le terminal du backend."
        : messageDepuisDetail(donnees?.detail);
    throw new ErreurApi(message, reponse.status);
  }
  return donnees;
}
