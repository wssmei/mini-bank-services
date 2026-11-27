import { normaliserDateIso } from "../utils/periodes.js";
import { requete } from "./client.js";

// Lecture seule : aucune donnée n'est modifiée. Les montants et les dates arrivent en texte, tels que le backend les renvoie.

// Ajoute les paramètres non vides à l'adresse. Un paramètre vide n'est jamais envoyé.
function avecParametres(chemin, parametres) {
  const params = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(parametres)) {
    if (valeur) params.set(cle, valeur);
  }
  const suite = params.toString();
  return suite ? `${chemin}?${suite}` : chemin;
}

// Historique d'un compte, du plus récent au plus ancien. Dates au format AAAA-MM-JJ, bornes incluses.
export function obtenirHistorique(compteId, { typeOperation = "", dateDebut = "", dateFin = "" } = {}) {
  return requete(
    avecParametres(`/comptes/${encodeURIComponent(compteId)}/operations`, {
      type_operation: typeOperation,
      date_debut: normaliserDateIso(dateDebut),
      date_fin: normaliserDateIso(dateFin),
    }),
  );
}

// Totaux de toute la banque. Le solde total actuel n'est pas filtré par période.
export function obtenirStatistiquesGlobales({ dateDebut = "", dateFin = "" } = {}) {
  return requete(
    avecParametres("/statistiques", {
      date_debut: normaliserDateIso(dateDebut),
      date_fin: normaliserDateIso(dateFin),
    }),
  );
}

// Totaux d'un compte. Sans période, solde_net_periode égale le solde du compte.
export function obtenirStatistiquesCompte(compteId, { dateDebut = "", dateFin = "" } = {}) {
  return requete(
    avecParametres(`/comptes/${encodeURIComponent(compteId)}/statistiques`, {
      date_debut: normaliserDateIso(dateDebut),
      date_fin: normaliserDateIso(dateFin),
    }),
  );
}
