from decimal import Decimal
from typing import Literal

from pydantic import Field

from app.schemas.base import SchemaBase

# Seuls les deux types publics sont acceptés. "BASE" est un type interne de SQLAlchemy.
TypeCompte = Literal["COURANT", "EPARGNE"]

# Numéro de compte : lettres, chiffres et tirets, entre 4 et 20 caractères.
PATTERN_NUMERO = r"^[A-Za-z0-9-]{4,20}$"


class CompteCreate(SchemaBase):
    """Requête de création. Le solde n'est pas un champ : il démarre à 0.00
    et ne change que par dépôt, retrait ou virement."""

    client_id: int = Field(gt=0)
    type_compte: TypeCompte
    numero: str | None = Field(default=None, pattern=PATTERN_NUMERO)


class CompteRead(SchemaBase):
    """Réponse. Le solde est un Decimal : Pydantic l'envoie en texte, par exemple "50000.00"."""

    id: int
    numero: str
    type_compte: str
    solde: Decimal
    client_id: int


class SoldeRead(SchemaBase):
    """Réponse de consultation du solde seul."""

    compte_id: int
    solde: Decimal
