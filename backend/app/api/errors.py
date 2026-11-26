"""Traduction des erreurs métier (BankError) en réponses HTTP.

Format unique de réponse d'erreur : {"detail": "message en français"}.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    BankError,
    ClientIntrouvableError,
    CompteIntrouvableError,
    NumeroCompteDejaUtiliseError,
    FondsInsuffisantsError,
    MontantInvalideError,
    VirementInvalideError,
)

STATUT_PAR_ERREUR: tuple[tuple[type[BankError], int], ...] = (
    (ClientIntrouvableError, 404),
    (CompteIntrouvableError, 404),
    (NumeroCompteDejaUtiliseError, 409),
    (FondsInsuffisantsError, 422),
    (MontantInvalideError, 400),
    (VirementInvalideError, 400),
)
STATUT_PAR_DEFAUT = 400


def statut_pour(erreur: BankError) -> int:
    for classe, statut in STATUT_PAR_ERREUR:
        if isinstance(erreur, classe):
            return statut
    return STATUT_PAR_DEFAUT


async def gerer_erreur_metier(request: Request, erreur: BankError) -> JSONResponse:
    return JSONResponse(
        status_code=statut_pour(erreur),
        content={"detail": str(erreur)},
    )


def enregistrer_gestionnaires_erreurs(app: FastAPI) -> None:
    app.add_exception_handler(BankError, gerer_erreur_metier)
