import { requete } from "./client.js";
import { listerClients, obtenirClient } from "./clients.js";

// Création d'un compte. Le numéro est facultatif : sans lui, le backend en génère un (CRT-… ou EPG-…).
// Le corps ne contient jamais de solde : il démarre à 0.00 côté serveur.
export function creerCompte({ clientId, typeCompte, numero }) {
  const corps = { client_id: clientId, type_compte: typeCompte };
  if (numero) corps.numero = numero;
  return requete("/comptes", { methode: "POST", corps });
}

// Détail d'un compte (numéro, type, client).
export function obtenirCompte(id) {
  return requete(`/comptes/${encodeURIComponent(id)}`);
}

// Solde seul, relu depuis le serveur.
export function obtenirSolde(id) {
  return requete(`/comptes/${encodeURIComponent(id)}/solde`);
}

// Le backend n'a pas de liste de tous les comptes : on la reconstruit à partir des fiches clients.
// Renvoie les clients, et l'ensemble des comptes de tous les clients.
export async function listerClientsEtComptes() {
  const clients = await listerClients();
  const fiches = await Promise.all(clients.map((client) => obtenirClient(client.id)));
  const comptes = fiches.flatMap((fiche) => fiche.comptes);
  return { clients, comptes };
}
