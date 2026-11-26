from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints


class SchemaBase(BaseModel):
    """Base commune des schémas.

    extra="forbid" : tout champ inconnu est refusé. Ainsi un client ne peut
    jamais imposer un solde, un identifiant ou un type interne dans une requête.
    from_attributes=True : permet de construire la réponse directement depuis un objet SQLAlchemy.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)


# Nom ou prénom : espaces retirés, entre 1 et 100 caractères.
TexteNom = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]

# Montant saisi sous forme de texte : la validation métier est faite par verifierMontant().
MontantTexte = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)]
