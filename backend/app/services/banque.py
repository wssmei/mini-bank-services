from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.domain import Transaction
from app.services.operations import (
    dans_transaction,
    effectuerDepot,
    effectuerRetrait,
    effectuerVirement,
    obtenirCompte,
)


class Banque:
    """Façade orientée objet : point d'entrée unique des opérations bancaires.

    Chaque méthode est une transaction SQL complète : elle réussit en entier
    (commit) ou n'a aucun effet (rollback).
    """

    def __init__(self, session: Session, nom: str = "BankServices") -> None:
        self._session = session
        self.nom = nom

    def deposer(self, compte_id: int, montant: Decimal | str) -> Transaction:
        def operation() -> Transaction:
            compte = obtenirCompte(self._session, compte_id)
            return effectuerDepot(compte, montant)

        return dans_transaction(self._session, operation)

    def retirer(self, compte_id: int, montant: Decimal | str) -> Transaction:
        def operation() -> Transaction:
            compte = obtenirCompte(self._session, compte_id)
            return effectuerRetrait(compte, montant)

        return dans_transaction(self._session, operation)

    def virer(
        self,
        source_id: int,
        destination_id: int,
        montant: Decimal | str,
    ) -> tuple[Transaction, Transaction]:
        return dans_transaction(
            self._session,
            lambda: effectuerVirement(self._session, source_id, destination_id, montant),
        )
