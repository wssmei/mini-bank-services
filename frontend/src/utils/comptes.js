import { libelleTypeCompte } from "./libelles.js";
import { formaterMontant } from "./montants.js";

// Règle alignée sur CompteCourant.DECOUVERT_MAX côté backend (5 000,00 DA).
export const DECOUVERT_COURANT_MAX = "5000.00";

function versCentimes(texte) {
  const propre = String(texte ?? "0").trim();
  const negatif = propre.startsWith("-");
  const sansSigne = negatif ? propre.slice(1) : propre;
  const [entier = "0", decimales = ""] = sansSigne.split(".");
  const cents = BigInt(entier || "0") * 100n + BigInt(decimales.padEnd(2, "0").slice(0, 2));
  return negatif ? -cents : cents;
}

function depuisCentimes(centimes) {
  const negatif = centimes < 0n;
  const abs = negatif ? -centimes : centimes;
  const entier = abs / 100n;
  const decimales = String(abs % 100n).padStart(2, "0");
  return `${negatif ? "-" : ""}${entier}.${decimales}`;
}

// Découvert autorisé pour un type de compte ("5000.00" pour COURANT, "0.00" pour EPARGNE).
export function decouvertAutorise(typeCompte) {
  return typeCompte === "COURANT" ? DECOUVERT_COURANT_MAX : "0.00";
}

// Montant disponible au retrait (solde actuel + découvert autorisé, borné à 0.00 minimum).
export function soldeDisponibleRetrait(compte) {
  if (!compte) return "0.00";
  const disponible = versCentimes(compte.solde) + versCentimes(decouvertAutorise(compte.type_compte));
  return disponible > 0n ? depuisCentimes(disponible) : "0.00";
}

// Nom du titulaire d'un compte, retrouvé dans la liste des clients chargée par la page.
export function nomDuTitulaire(clientId, clients) {
  const client = clients.find((c) => c.id === clientId);
  return client ? `${client.nom} ${client.prenom}` : "Client inconnu";
}

// Libellé d'un compte dans une liste : numéro, titulaire, type et solde.
export function libelleCompte(compte, clients) {
  const titulaire = nomDuTitulaire(compte.client_id, clients);
  return `${compte.numero} · ${titulaire} · ${libelleTypeCompte(compte.type_compte)} · solde ${formaterMontant(compte.solde)} DA`;
}
