"""Gestion des clients (Module 1 du sujet).

Ces fonctions ne connaissent pas l'API : elles reçoivent des valeurs simples
et renvoient des objets du domaine. Les schémas Pydantic restent dans la couche API.
"""

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import ClientIntrouvableError
from app.models.domain import Client
from app.services.operations import dans_transaction

CHAMPS_MODIFIABLES = frozenset({"nom", "prenom"})


def creerClient(session: Session, nom: str, prenom: str) -> Client:
    client = Client(nom=nom, prenom=prenom)

    def operation() -> Client:
        session.add(client)
        session.flush()  # attribue l'identifiant avant le commit
        return client

    return dans_transaction(session, operation)


def echapperMotif(texte: str) -> str:
    """Échappe les caractères joker de LIKE pour les traiter comme du texte ordinaire."""
    return texte.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def listerClients(session: Session, q: str | None = None) -> list[Client]:
    """Liste triée par nom puis prénom. Si q est fourni, filtre sur le nom ou le prénom,
    sans tenir compte de la casse."""
    stmt = select(Client).order_by(Client.nom, Client.prenom, Client.id)
    terme = (q or "").strip()
    if terme:
        motif = f"%{echapperMotif(terme)}%"
        stmt = stmt.where(
            or_(
                Client.nom.ilike(motif, escape="\\"),
                Client.prenom.ilike(motif, escape="\\"),
            )
        )
    return list(session.scalars(stmt))


def obtenirClient(session: Session, client_id: int) -> Client:
    client = session.get(Client, client_id)
    if client is None:
        raise ClientIntrouvableError(f"Aucun client d'identifiant {client_id}.")
    return client


def modifierClient(session: Session, client_id: int, **changements) -> Client:
    """Modifie uniquement les champs autorisés, dans une transaction."""
    inconnus = set(changements) - CHAMPS_MODIFIABLES
    if inconnus:
        raise ValueError(f"Champs non modifiables : {', '.join(sorted(inconnus))}")

    def operation() -> Client:
        client = obtenirClient(session, client_id)
        for champ, valeur in changements.items():
            setattr(client, champ, valeur)
        return client

    return dans_transaction(session, operation)
