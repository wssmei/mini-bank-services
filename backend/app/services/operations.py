"""Fonctions procédurales (Partie B) et règles impératives (Partie A).

Convention : les fonctions qui modifient un compte ne font JAMAIS de commit.
Le commit ou le rollback est décidé par dans_transaction(), qui encadre
l'opération entière. C'est ce qui rend le virement atomique.
"""

from collections.abc import Callable, Iterable
from decimal import Decimal, InvalidOperation
from typing import TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    CompteIntrouvableError,
    MontantInvalideError,
    VirementInvalideError,
)
from app.models.domain import CompteBancaire, Transaction, TypeOperation

CENT = Decimal("0.01")
MONTANT_MAX = Decimal("999999999999.99")  # Limite de Numeric(14, 2)

OPERATIONS_CREDITRICES = (TypeOperation.DEPOT, TypeOperation.VIREMENT_CREDIT)
OPERATIONS_DEBITRICES = (TypeOperation.RETRAIT, TypeOperation.VIREMENT_DEBIT)

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Validation (verifierMontant)
# ---------------------------------------------------------------------------

def verifierMontant(valeur) -> Decimal:
    """Valide un montant saisi et renvoie un Decimal exact.

    Refuse : float (imprécis), bool, non-nombre, NaN/infini, valeur <= 0,
    plus de deux décimales, valeur hors limite de la colonne.
    """
    if isinstance(valeur, (float, bool)):
        raise MontantInvalideError("Saisissez le montant sous forme décimale, par exemple 1200.50.")

    try:
        montant = valeur if isinstance(valeur, Decimal) else Decimal(str(valeur).strip())
    except (InvalidOperation, ValueError):
        raise MontantInvalideError("Le montant n'est pas un nombre valide.") from None

    if not montant.is_finite():
        raise MontantInvalideError("Le montant n'est pas un nombre valide.")
    if montant <= 0:
        raise MontantInvalideError("Le montant doit être strictement positif.")
    if montant > MONTANT_MAX:
        raise MontantInvalideError("Le montant dépasse la limite autorisée.")

    try:
        deux_decimales = montant == montant.quantize(CENT)
    except InvalidOperation:
        raise MontantInvalideError("Le montant dépasse la limite autorisée.") from None
    if not deux_decimales:
        raise MontantInvalideError("Le montant ne peut pas avoir plus de deux décimales.")

    # Normalisation : "12000" devient 12000.00, comme dans la base (Numeric(14, 2)).
    return montant.quantize(CENT)


# ---------------------------------------------------------------------------
# Calculs sur l'historique (boucles impératives)
# ---------------------------------------------------------------------------

def calculerSolde(solde_initial: Decimal, operations: Iterable[Transaction]) -> Decimal:
    """Recalcule le solde à partir de l'historique. Ne modifie aucun objet."""
    solde = solde_initial
    for operation in operations:
        if operation.type_operation in OPERATIONS_CREDITRICES:
            solde += operation.montant
        elif operation.type_operation in OPERATIONS_DEBITRICES:
            solde -= operation.montant
    return solde


def calculerTotalOperations(
    operations: Iterable[Transaction],
    type_operation: TypeOperation,
) -> Decimal:
    """Additionne les montants d'un type d'opération donné."""
    total = Decimal("0.00")
    for operation in operations:
        if operation.type_operation == type_operation:
            total += operation.montant
    return total


# ---------------------------------------------------------------------------
# Opérations unitaires (effectuerDepot, effectuerRetrait)
# ---------------------------------------------------------------------------

def creerTransaction(
    compte: CompteBancaire,
    type_operation: TypeOperation,
    montant: Decimal,
) -> Transaction:
    """Enregistre une ligne d'historique. Appelée après la modification du solde.

    On passe par compte.transactions.append() et non par Transaction(compte=...) :
    l'ajout à la collection déclenche l'ajout automatique à la session.
    """
    tx = Transaction(
        type_operation=type_operation,
        montant=montant,
        solde_apres=compte.solde,
    )
    compte.transactions.append(tx)
    return tx


def effectuerDepot(compte: CompteBancaire, montant) -> Transaction:
    montant = verifierMontant(montant)
    compte.deposer(montant)
    return creerTransaction(compte, TypeOperation.DEPOT, montant)


def effectuerRetrait(compte: CompteBancaire, montant) -> Transaction:
    montant = verifierMontant(montant)
    compte.retirer(montant)  # Lève FondsInsuffisantsError avant toute modification
    return creerTransaction(compte, TypeOperation.RETRAIT, montant)


# ---------------------------------------------------------------------------
# Accès verrouillé et virement atomique
# ---------------------------------------------------------------------------

def obtenirCompte(session: Session, compte_id: int) -> CompteBancaire:
    """Charge un compte avec verrou de ligne (SELECT ... FOR UPDATE).

    Le verrou empêche deux opérations concurrentes de lire le même solde
    et de le modifier chacune de son côté (perte de mise à jour).
    populate_existing force la relecture si le compte est déjà en mémoire.
    """
    stmt = (
        select(CompteBancaire)
        .where(CompteBancaire.id == compte_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    compte = session.scalar(stmt)
    if compte is None:
        raise CompteIntrouvableError(f"Aucun compte d'identifiant {compte_id}.")
    return compte


def effectuerVirement(
    session: Session,
    source_id: int,
    destination_id: int,
    montant,
) -> tuple[Transaction, Transaction]:
    """Débite la source et crédite la destination. Ne fait PAS de commit.

    Les deux comptes sont verrouillés dans un ordre fixe (identifiant croissant)
    pour éviter les interblocages entre deux virements croisés.
    """
    montant = verifierMontant(montant)
    if source_id == destination_id:
        raise VirementInvalideError("Le virement doit concerner deux comptes distincts.")

    verrous = {cid: obtenirCompte(session, cid) for cid in sorted((source_id, destination_id))}
    source = verrous[source_id]
    destination = verrous[destination_id]

    source.retirer(montant)       # Peut lever FondsInsuffisantsError
    destination.deposer(montant)

    debit = creerTransaction(source, TypeOperation.VIREMENT_DEBIT, montant)
    credit = creerTransaction(destination, TypeOperation.VIREMENT_CREDIT, montant)
    return debit, credit


def dans_transaction(session: Session, operation: Callable[[], T]) -> T:
    """Exécute une opération dans UNE transaction SQL.

    Succès : un seul commit à la fin.
    Échec à n'importe quelle étape : rollback, et aucune modification n'est conservée.
    """
    try:
        resultat = operation()
        session.commit()
    except Exception:
        session.rollback()
        raise
    return resultat
