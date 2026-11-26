from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.operation import MontantOperation, TransactionRead, VirementCreate, VirementRead
from app.services.banque import Banque

# Pas de préfixe : les dépôts et retraits sont rattachés à un compte, le virement à deux comptes.
router = APIRouter(tags=["Opérations"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/comptes/{compte_id}/depots",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
)
def deposer(compte_id: int, donnees: MontantOperation, db: DbSession):
    return Banque(db).deposer(compte_id, donnees.montant)


@router.post(
    "/comptes/{compte_id}/retraits",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
)
def retirer(compte_id: int, donnees: MontantOperation, db: DbSession):
    return Banque(db).retirer(compte_id, donnees.montant)


@router.post("/virements", response_model=VirementRead, status_code=status.HTTP_201_CREATED)
def virer(donnees: VirementCreate, db: DbSession):
    debit, credit = Banque(db).virer(donnees.source_id, donnees.destination_id, donnees.montant)
    return {"debit": debit, "credit": credit}
