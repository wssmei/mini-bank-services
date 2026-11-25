"""Programmation fonctionnelle (Partie D).

Toutes les fonctions de ce module sont PURES :
- pour les mêmes arguments, elles renvoient toujours le même résultat ;
- elles ne modifient ni la collection reçue, ni les objets qu'elle contient ;
- elles n'accèdent ni à la base de données, ni à un état global.
"""

from collections.abc import Iterable
from decimal import ROUND_HALF_UP, Decimal
from functools import reduce

from app.models.domain import Transaction, TypeOperation
from app.services.operations import CENT

TAUX_FRAIS_SIMULES = Decimal("0.01")  # 1 % : hypothèse pédagogique


def filtrerParType(
    operations: Iterable[Transaction],
    type_operation: TypeOperation,
) -> list[Transaction]:
    """Sélectionne les opérations d'un type donné (filter)."""
    return list(filter(lambda op: op.type_operation == type_operation, operations))


def versAffichage(operations: Iterable[Transaction]) -> list[dict[str, str | None]]:
    """Transforme chaque opération en ligne d'affichage (map).

    Les montants sont des chaînes à deux décimales : Decimal n'est pas
    sérialisable en JSON par défaut, et cela évite les écarts d'affichage.
    """
    return list(map(_ligne_affichage, operations))


def _ligne_affichage(op: Transaction) -> dict[str, str | None]:
    return {
        "type": str(op.type_operation),
        "montant": format(op.montant, ".2f"),
        "solde_apres": format(op.solde_apres, ".2f"),
        "date": op.date_operation.isoformat() if op.date_operation else None,
    }


def totaliserParType(
    operations: Iterable[Transaction],
    type_operation: TypeOperation,
) -> Decimal:
    """Cumul des montants d'un type donné : filter, puis reduce."""
    return reduce(
        lambda total, op: total + op.montant,
        filtrerParType(operations, type_operation),
        Decimal("0.00"),
    )


def calculerFrais(montant: Decimal, taux: Decimal = TAUX_FRAIS_SIMULES) -> Decimal:
    """Frais simulés : montant × taux, arrondi au centime. Fonction pure."""
    if not Decimal("0") <= taux <= Decimal("1"):
        raise ValueError("Le taux doit être compris entre 0 et 1.")
    return (montant * taux).quantize(CENT, rounding=ROUND_HALF_UP)


def totaliserFraisSimules(operations: Iterable[Transaction]) -> Decimal:
    """Frais simulés cumulés sur les retraits : filter, map, puis reduce."""
    retraits = filtrerParType(operations, TypeOperation.RETRAIT)
    frais = map(lambda op: calculerFrais(op.montant), retraits)
    return reduce(lambda total, f: total + f, frais, Decimal("0.00"))
