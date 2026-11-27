import { requete } from "./client.js";

// Opérations bancaires. Le montant part toujours en texte ("1200.50") : jamais de nombre JSON.

// Dépôt sur un compte. Renvoie la transaction créée (montant, solde_apres).
export function deposer(compteId, montant) {
  return requete(`/comptes/${encodeURIComponent(compteId)}/depots`, {
    methode: "POST",
    corps: { montant },
  });
}

// Retrait sur un compte. Refusé (422) si la règle du compte ne le permet pas.
export function retirer(compteId, montant) {
  return requete(`/comptes/${encodeURIComponent(compteId)}/retraits`, {
    methode: "POST",
    corps: { montant },
  });
}

// Virement atomique. Renvoie { debit, credit } : les deux lignes de l'historique.
export function virer({ sourceId, destinationId, montant }) {
  return requete("/virements", {
    methode: "POST",
    corps: { source_id: sourceId, destination_id: destinationId, montant },
  });
}
