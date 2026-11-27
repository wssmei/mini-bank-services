from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.domain import TypeOperation
from app.schemas.operation import TransactionRead
from app.services import historique as service

router = APIRouter(prefix="/comptes", tags=["Historique"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/{compte_id}/operations", response_model=list[TransactionRead])
def historique_compte(
    compte_id: int,
    db: DbSession,
    type_operation: Annotated[TypeOperation | None, Query()] = None,
    date_debut: Annotated[date | None, Query()] = None,
    date_fin: Annotated[date | None, Query()] = None,
):
    return service.historiqueCompte(db, compte_id, type_operation, date_debut, date_fin)
