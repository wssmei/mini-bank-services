from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.compte import CompteCreate, CompteRead, SoldeRead
from app.services import comptes as service

router = APIRouter(prefix="/comptes", tags=["Comptes"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=CompteRead, status_code=status.HTTP_201_CREATED)
def creer_compte(donnees: CompteCreate, db: DbSession):
    return service.creerCompte(db, donnees.client_id, donnees.type_compte, donnees.numero)


@router.get("/{compte_id}", response_model=CompteRead)
def detail_compte(compte_id: int, db: DbSession):
    return service.consulterCompte(db, compte_id)


@router.get("/{compte_id}/solde", response_model=SoldeRead)
def solde_compte(compte_id: int, db: DbSession):
    compte = service.consulterCompte(db, compte_id)
    return SoldeRead(compte_id=compte.id, solde=compte.solde)
