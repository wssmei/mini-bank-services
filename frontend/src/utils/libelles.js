// Libellés français des types de compte. Le backend envoie COURANT ou EPARGNE.
export const LIBELLES_TYPE_COMPTE = { COURANT: "Courant", EPARGNE: "Épargne" };

export function libelleTypeCompte(type) {
  return LIBELLES_TYPE_COMPTE[type] ?? type;
}

// Libellés des opérations. Un virement apparaît sur deux lignes : « émis » côté compte débité,
// « reçu » côté compte crédité.
export const LIBELLES_TYPE_OPERATION = {
  DEPOT: "Dépôt",
  RETRAIT: "Retrait",
  VIREMENT_DEBIT: "Virement émis",
  VIREMENT_CREDIT: "Virement reçu",
};

export function libelleTypeOperation(type) {
  return LIBELLES_TYPE_OPERATION[type] ?? type;
}

// « 1 opération » ou « 3 opérations ».
export function libelleNombreOperations(nombre) {
  return nombre === 1 ? "1 opération" : `${nombre} opérations`;
}
