"""Statistiques de la banque et par compte (consultation et statistiques du sujet).

Lecture seule. Les totaux sont calculés en SQL (COUNT et SUM avec GROUP BY).
Les montants sont des Decimal arrondis au centime.

Comptabilisation des virements (pour éviter le double comptage) :
- Dépôts et retraits : opérations externes, comptées une fois chacune.
- Virement : une ligne VIREMENT_DEBIT (compte source) et une ligne VIREMENT_CREDIT
  (compte destinataire) pour une seule opération.
  * Au niveau GLOBAL : seule la ligne débit est comptée. Un virement vaut donc une unité.
  * Au niveau d'un COMPTE : débits émis et crédits reçus sont affichés séparément,
    car ce sont deux mouvements réels de ce compte.
- Conséquence : total des dépôts - total des retraits = somme des soldes,
  puisque les virements s'annulent entre comptes.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import PeriodeInvalideError
from app.models.domain import CompteBancaire, Transaction, TypeOperation
from app.services.comptes import consulterCompte
from app.services.historique import bornesUtc
from app.services.operations import CENT

ZERO = Decimal("0.00")


def _verifier_periode(date_debut: date | None, date_fin: date | None) -> None:
    if date_debut is not None and date_fin is not None and date_debut > date_fin:
        raise PeriodeInvalideError(
            "La date de début doit être antérieure ou égale à la date de fin."
        )


def _conditions_periode(date_debut: date | None, date_fin: date | None) -> list:
    debut, fin = bornesUtc(date_debut, date_fin)
    conditions = []
    if debut is not None:
        conditions.append(Transaction.date_operation >= debut)
    if fin is not None:
        conditions.append(Transaction.date_operation < fin)
    return conditions


def _totaux_par_type(session: Session, conditions: list) -> dict[str, tuple[int, Decimal]]:
    """Agrégation SQL : COUNT et SUM par type d'opération, en une seule requête."""
    stmt = select(
        Transaction.type_operation,
        func.count(Transaction.id),
        func.sum(Transaction.montant),
    )
    for condition in conditions:
        stmt = stmt.where(condition)
    stmt = stmt.group_by(Transaction.type_operation)

    return {
        type_op: (nombre, (montant or ZERO).quantize(CENT))
        for type_op, nombre, montant in session.execute(stmt)
    }


def _total(totaux: dict[str, tuple[int, Decimal]], type_op: TypeOperation) -> dict:
    """Un type absent de la base donne 0 opération et 0.00 (pas d'erreur)."""
    nombre, montant = totaux.get(type_op, (0, ZERO))
    return {"nombre": nombre, "montant": montant}


def statistiquesCompte(
    session: Session,
    compte_id: int,
    date_debut: date | None = None,
    date_fin: date | None = None,
) -> dict:
    """Totaux d'un compte sur une période facultative. Lève CompteIntrouvableError si absent."""
    consulterCompte(session, compte_id)
    _verifier_periode(date_debut, date_fin)

    conditions = [Transaction.compte_id == compte_id, *_conditions_periode(date_debut, date_fin)]
    totaux = _totaux_par_type(session, conditions)

    depots = _total(totaux, TypeOperation.DEPOT)
    retraits = _total(totaux, TypeOperation.RETRAIT)
    emis = _total(totaux, TypeOperation.VIREMENT_DEBIT)
    recus = _total(totaux, TypeOperation.VIREMENT_CREDIT)

    solde_net = depots["montant"] - retraits["montant"] - emis["montant"] + recus["montant"]

    return {
        "compte_id": compte_id,
        "depots": depots,
        "retraits": retraits,
        "virements_emis": emis,
        "virements_recus": recus,
        "solde_net_periode": solde_net.quantize(CENT),
    }


def statistiquesGlobales(
    session: Session,
    date_debut: date | None = None,
    date_fin: date | None = None,
) -> dict:
    """Totaux de toute la banque sur une période facultative.

    Les virements sont comptés une fois (ligne débit). Le solde total est celui du moment,
    il ne dépend pas de la période.
    """
    _verifier_periode(date_debut, date_fin)

    totaux = _totaux_par_type(session, _conditions_periode(date_debut, date_fin))
    nombre_comptes = session.scalar(select(func.count(CompteBancaire.id)))
    solde_total = session.scalar(select(func.sum(CompteBancaire.solde)))

    return {
        "nombre_comptes": nombre_comptes,
        "depots": _total(totaux, TypeOperation.DEPOT),
        "retraits": _total(totaux, TypeOperation.RETRAIT),
        "virements": _total(totaux, TypeOperation.VIREMENT_DEBIT),
        "solde_total_actuel": (solde_total or ZERO).quantize(CENT),
    }
