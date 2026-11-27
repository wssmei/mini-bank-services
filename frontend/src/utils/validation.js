// Fonctions pures : elles ne lisent ni n'écrivent rien en dehors de leurs arguments.

// Mêmes règles que le backend (TexteNom : 1 à 100 caractères après suppression des espaces).
export const LONGUEUR_MAX_TEXTE = 100;

export function validerTexte(valeur, libelle) {
  const texte = valeur.trim();
  if (texte === "") return `${libelle} est obligatoire.`;
  if (texte.length > LONGUEUR_MAX_TEXTE) {
    return `${libelle} ne doit pas dépasser ${LONGUEUR_MAX_TEXTE} caractères.`;
  }
  return "";
}

export function changementsDepuis(original, saisi) {
  const changements = {};
  for (const champ of ["nom", "prenom"]) {
    const nouvelle = saisi[champ].trim();
    if (nouvelle !== original[champ]) {
      changements[champ] = nouvelle;
    }
  }
  return changements;
}

// Normalise un montant saisi : supprime les espaces et remplace la virgule par un point.
export function normaliserMontant(valeur) {
  return String(valeur ?? "")
    .replace(/[\s\u00A0\u202F]/g, "")
    .replace(",", ".");
}

// Montant d'une opération : nombre strictement positif, deux décimales au maximum,
// au plus 12 chiffres avant la virgule (limite de Numeric(14, 2)).
const MOTIF_MONTANT = /^\d+(\.\d{1,2})?$/;
const CHIFFRES_ENTIERS_MAX = 12;

export function validerMontant(valeur) {
  const montant = normaliserMontant(valeur);
  if (montant === "") return "Le montant est obligatoire.";
  if (!MOTIF_MONTANT.test(montant)) {
    return "Saisissez un montant positif, par exemple 1200.50 (deux décimales au maximum).";
  }
  if (montant.split(".")[0].length > CHIFFRES_ENTIERS_MAX) return "Le montant est trop grand.";
  if (/^0+(\.0+)?$/.test(montant)) return "Le montant doit être supérieur à zéro.";
  return "";
}

// Numéro de compte facultatif : vide = généré par le serveur.
export const MOTIF_NUMERO_COMPTE = /^[A-Za-z0-9-]{4,20}$/;

export function validerNumeroCompte(valeur) {
  const numero = valeur.trim();
  if (numero === "") return "";
  if (!MOTIF_NUMERO_COMPTE.test(numero)) {
    return "Le numéro doit contenir de 4 à 20 caractères : lettres, chiffres ou tirets.";
  }
  return "";
}
