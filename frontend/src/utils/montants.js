// Affichage des montants. Le backend renvoie des montants en texte ("33000.00") :
// on reste en texte pour ne jamais perdre de précision, sans passer par un nombre à virgule flottante.

// "33000.00" -> "33 000,00". Mise en forme française : espaces insécables pour les milliers, virgule décimale.
export function formaterMontant(texte) {
  const [entier, decimales = "00"] = String(texte).split(".");
  const negatif = entier.startsWith("-");
  const chiffres = negatif ? entier.slice(1) : entier;
  const groupes = chiffres.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negatif ? "-" : ""}${groupes},${decimales.padEnd(2, "0")}`;
}
