"""Gestion des comptes bancaires (Module 2 du sujet).

Création d'un compte pour un client existant, avec le type courant ou épargne.
Le solde démarre à 0.00 et ne change que par opération (dépôt, retrait, virement).
"""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    BankError,
    CompteIntrouvableError,
    NumeroCompteDejaUtiliseError,
)
from app.models.domain import CompteBancaire, CompteCourant, CompteEpargne
from app.services.clients import obtenirClient
from app.services.operations import dans_transaction

CLASSES_PAR_TYPE: dict[str, type[CompteBancaire]] = {
    "COURANT": CompteCourant,
    "EPARGNE": CompteEpargne,
}
PREFIXES_PAR_TYPE = {"COURANT": "CRT", "EPARGNE": "EPG"}
TENTATIVES_NUMERO = 5


def _numero_existe(session: Session, numero: str) -> bool:
    return session.scalar(
        select(CompteBancaire.id).where(CompteBancaire.numero == numero)
    ) is not None


def _numero_genere(session: Session, type_compte: str) -> str:
    for _ in range(TENTATIVES_NUMERO):
        candidat = f"{PREFIXES_PAR_TYPE[type_compte]}-{secrets.token_hex(4).upper()}"
        if not _numero_existe(session, candidat):
            return candidat
    raise BankError("Impossible de générer un numéro de compte. Réessayez.")


def creerCompte(
    session: Session,
    client_id: int,
    type_compte: str,
    numero: str | None = None,
) -> CompteBancaire:
    """Crée un compte rattaché à un client existant. Lève ClientIntrouvableError si absent."""
    client = obtenirClient(session, client_id)
    classe = CLASSES_PAR_TYPE[type_compte]

    def operation() -> CompteBancaire:
        if numero is not None and _numero_existe(session, numero):
            raise NumeroCompteDejaUtiliseError(
                f"Le numéro de compte « {numero} » est déjà utilisé."
            )
        numero_final = numero if numero is not None else _numero_genere(session, type_compte)
        compte = classe(numero=numero_final, client=client)
        session.add(compte)
        session.flush()
        return compte

    return dans_transaction(session, operation)


def consulterCompte(session: Session, compte_id: int) -> CompteBancaire:
    """Lecture seule : aucune modification, aucun verrou."""
    compte = session.get(CompteBancaire, compte_id)
    if compte is None:
        raise CompteIntrouvableError(f"Aucun compte d'identifiant {compte_id}.")
    return compte
