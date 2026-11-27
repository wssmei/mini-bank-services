from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from pydantic import Field, field_validator

from app.schemas.base import MontantTexte, SchemaBase


class MontantOperation(SchemaBase):
    """Corps commun des dépôts et retraits.

    Le montant doit être une chaîne : un nombre JSON (float) perd de la précision.
    La validation métier (positif, deux décimales, limite) est faite par verifierMontant()
    dans le service, pour que l'API et la logique métier utilisent la même règle.
    """

    montant: MontantTexte

    @field_validator("montant", mode="before")
    @classmethod
    def refuser_nombre_brut(cls, valeur: Any) -> Any:
        if isinstance(valeur, (int, float)):
            raise ValueError('Saisissez le montant entre guillemets, par exemple "1200.50".')
        return valeur


class VirementCreate(MontantOperation):
    """Virement. Le fait que source et destination soient différentes est vérifié
    par le service (VirementInvalideError), pour garder une seule source de règles."""

    source_id: int = Field(gt=0)
    destination_id: int = Field(gt=0)


class TransactionRead(SchemaBase):
    id: int
    compte_id: int
    type_operation: str
    montant: Decimal
    solde_apres: Decimal
    date_operation: datetime

    @field_validator("date_operation", mode="after")
    @classmethod
    def en_utc(cls, valeur: datetime) -> datetime:
        """Renvoie toujours l'instant en UTC, quel que soit le fuseau du serveur de base.

        PostgreSQL renvoie les dates dans le fuseau de sa session (ici Africa/Algiers),
        alors qu'une ligne fraîchement créée est en UTC. Sans cette normalisation,
        le même instant apparaîtrait avec deux écritures différentes selon l'endpoint.
        Une date sans fuseau (SQLite) est, par convention de la base, en UTC.
        """
        if valeur.tzinfo is None:
            return valeur.replace(tzinfo=timezone.utc)
        return valeur.astimezone(timezone.utc)


class VirementRead(SchemaBase):
    """Réponse d'un virement : les deux lignes de l'historique, débit et crédit."""

    debit: TransactionRead
    credit: TransactionRead
