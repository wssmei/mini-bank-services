"""Historique des opérations d'un compte, avec filtres (consultation du sujet).

Lecture seule : aucune modification, aucun commit.

Les dates saisies sont des jours calendaires vus depuis l'Algérie (Africa/Algiers).
Les horodatages sont stockés en UTC : chaque jour local est donc converti en bornes UTC.
"""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import PeriodeInvalideError
from app.models.domain import Transaction, TypeOperation
from app.services.comptes import consulterCompte

FUSEAU_LOCAL = ZoneInfo("Africa/Algiers")
UTC = timezone.utc


def _minuit_utc(jour: date) -> datetime | None:
    """Minuit local de ce jour, exprimé en UTC.

    Renvoie None si la date sort de l'intervalle représentable : la borne est alors
    ouverte, ce qui est correct puisqu'aucune opération ne peut tomber hors de cet intervalle.
    """
    try:
        return datetime.combine(jour, time.min, tzinfo=FUSEAU_LOCAL).astimezone(UTC)
    except OverflowError:
        return None


def bornesUtc(
    date_debut: date | None,
    date_fin: date | None,
) -> tuple[datetime | None, datetime | None]:
    """Convertit une période de jours locaux en bornes UTC de la forme [debut, fin[.

    debut : minuit local de date_debut (inclus).
    fin : minuit local du jour SUIVANT date_fin (exclu), ce qui rend date_fin inclus.
    Une borne absente reste None (période ouverte).
    """
    debut = None if date_debut is None else _minuit_utc(date_debut)

    fin = None
    if date_fin is not None:
        try:
            lendemain = date_fin + timedelta(days=1)
        except OverflowError:
            lendemain = None
        fin = None if lendemain is None else _minuit_utc(lendemain)

    return debut, fin


def historiqueCompte(
    session: Session,
    compte_id: int,
    type_operation: TypeOperation | None = None,
    date_debut: date | None = None,
    date_fin: date | None = None,
) -> list[Transaction]:
    """Opérations d'un compte, les plus récentes d'abord.

    Lève CompteIntrouvableError si le compte n'existe pas,
    PeriodeInvalideError si date_debut est postérieure à date_fin.
    """
    consulterCompte(session, compte_id)

    if date_debut is not None and date_fin is not None and date_debut > date_fin:
        raise PeriodeInvalideError(
            "La date de début doit être antérieure ou égale à la date de fin."
        )

    debut_utc, fin_utc = bornesUtc(date_debut, date_fin)

    stmt = select(Transaction).where(Transaction.compte_id == compte_id)
    if type_operation is not None:
        stmt = stmt.where(Transaction.type_operation == type_operation)
    if debut_utc is not None:
        stmt = stmt.where(Transaction.date_operation >= debut_utc)
    if fin_utc is not None:
        stmt = stmt.where(Transaction.date_operation < fin_utc)
    stmt = stmt.order_by(Transaction.date_operation.desc(), Transaction.id.desc())

    return list(session.scalars(stmt))
