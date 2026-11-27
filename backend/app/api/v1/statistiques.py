from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.statistique import StatistiquesCompte, StatistiquesGlobales
from app.services import statistiques as service

# Pas de préfixe : statistiques globales à la racine, statistiques d'un compte sous /comptes.
router = APIRouter(tags=["Statistiques"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/statistiques", response_model=StatistiquesGlobales)
def statistiques_globales(
    db: DbSession,
    date_debut: Annotated[date | None, Query()] = None,
    date_fin: Annotated[date | None, Query()] = None,
):
    return service.statistiquesGlobales(db, date_debut, date_fin)


@router.get("/comptes/{compte_id}/statistiques", response_model=StatistiquesCompte)
def statistiques_compte(
    compte_id: int,
    db: DbSession,
    date_debut: Annotated[date | None, Query()] = None,
    date_fin: Annotated[date | None, Query()] = None,
):
    return service.statistiquesCompte(db, compte_id, date_debut, date_fin)
