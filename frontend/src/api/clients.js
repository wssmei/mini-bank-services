import { requete } from "./client.js";

// Liste des clients. Le paramètre q filtre sur le nom ou le prénom (recherche côté serveur).
export function listerClients(q = "") {
  const recherche = q.trim();
  const parametres = recherche ? `?q=${encodeURIComponent(recherche)}` : "";
  return requete(`/clients${parametres}`);
}

// Création. Le corps ne contient que nom et prenom : le backend refuse tout autre champ.
export function creerClient({ nom, prenom }) {
  return requete("/clients", { methode: "POST", corps: { nom, prenom } });
}

// Fiche d'un client : identité et liste de ses comptes.
export function obtenirClient(id) {
  return requete(`/clients/${encodeURIComponent(id)}`);
}

// Modification partielle (PATCH) : seuls les champs présents dans changements sont modifiés.
export function modifierClient(id, changements) {
  return requete(`/clients/${encodeURIComponent(id)}`, { methode: "PATCH", corps: changements });
}
