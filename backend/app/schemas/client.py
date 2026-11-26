
from pydantic import Field, model_validator

from app.schemas.base import SchemaBase, TexteNom
from app.schemas.compte import CompteRead


class ClientCreate(SchemaBase):
    nom: TexteNom
    prenom: TexteNom


class ClientUpdate(SchemaBase):
    """Modification partielle : au moins un champ, et aucun champ mis à null."""

    nom: TexteNom | None = None
    prenom: TexteNom | None = None

    @model_validator(mode="after")
    def valider_modifications(self):
        if not self.model_fields_set:
            raise ValueError("Indiquez au moins un champ à modifier.")
        if any(getattr(self, champ) is None for champ in self.model_fields_set):
            raise ValueError("Un champ modifié ne peut pas être vide.")
        return self


class ClientRead(SchemaBase):
    id: int
    nom: str
    prenom: str


class ClientDetail(ClientRead):
    """Fiche client : coordonnées et liste des comptes (fiche, phase 3.3)."""

    comptes: list[CompteRead] = Field(default_factory=list)

