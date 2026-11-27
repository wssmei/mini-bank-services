// Périodes (dates ISO YYYY-MM-DD, ou vides) et affichage des dates des opérations.

const MOTIF_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const MOTIF_FR = /^(\d{2})[/-](\d{2})[/-](\d{4})$/;

function dateCalendaireValide(annee, mois, jour) {
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  return (
    d.getUTCFullYear() === annee &&
    d.getUTCMonth() === mois - 1 &&
    d.getUTCDate() === jour
  );
}

// Normalise une date saisie (ou objet Date) au format ISO YYYY-MM-DD attendu par le backend.
// Renvoie "" si la saisie est vide, ou la chaîne brute si elle ne correspond à aucun format reconnu.
export function normaliserDateIso(valeur) {
  if (!valeur) return "";
  if (valeur instanceof Date && !Number.isNaN(valeur.getTime())) {
    const a = valeur.getUTCFullYear();
    const m = String(valeur.getUTCMonth() + 1).padStart(2, "0");
    const j = String(valeur.getUTCDate()).padStart(2, "0");
    return `${a}-${m}-${j}`;
  }
  const texte = String(valeur).trim();
  if (texte === "") return "";

  const extrait = texte.length > 10 && texte[10] === "T" ? texte.slice(0, 10) : texte;
  const iso = MOTIF_ISO.exec(extrait);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const fr = MOTIF_FR.exec(texte);
  if (fr) {
    return `${fr[3]}-${fr[2]}-${fr[1]}`;
  }

  return texte;
}

export function estDateIsoValide(valeur) {
  const iso = normaliserDateIso(valeur);
  if (iso === "") return true;
  const match = MOTIF_ISO.exec(iso);
  if (!match) return false;
  return dateCalendaireValide(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function validerPeriode(dateDebut, dateFin) {
  const debut = normaliserDateIso(dateDebut);
  const fin = normaliserDateIso(dateFin);
  if (debut && !estDateIsoValide(debut)) {
    return "Date de début invalide (format attendu : AAAA-MM-JJ).";
  }
  if (fin && !estDateIsoValide(fin)) {
    return "Date de fin invalide (format attendu : AAAA-MM-JJ).";
  }
  if (debut && fin && debut > fin) {
    return "La date de début doit être antérieure ou égale à la date de fin.";
  }
  return "";
}

// Le backend envoie les dates en UTC (suffixe Z). On les affiche au fuseau d'Algérie, en format français.
const FORMAT_DATE_HEURE = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Africa/Algiers",
});

export function formaterDateHeure(dateIso) {
  return FORMAT_DATE_HEURE.format(new Date(dateIso));
}
