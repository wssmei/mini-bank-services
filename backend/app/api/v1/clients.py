from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.client import ClientCreate, ClientDetail, ClientRead, ClientUpdate
from app.services import clients as service

router = APIRouter(prefix="/clients", tags=["Clients"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def creer_client(donnees: ClientCreate, db: DbSession):
    return service.creerClient(db, donnees.nom, donnees.prenom)


@router.get("", response_model=list[ClientRead])
def lister_clients(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
):
    return service.listerClients(db, q)


@router.get("/{client_id}", response_model=ClientDetail)
def detail_client(client_id: int, db: DbSession):
    return service.obtenirClient(db, client_id)


@router.patch("/{client_id}", response_model=ClientRead)
def modifier_client(client_id: int, donnees: ClientUpdate, db: DbSession):
    # exclude_unset : seuls les champs envoyés par le client sont modifiés
    return service.modifierClient(db, client_id, **donnees.model_dump(exclude_unset=True))
