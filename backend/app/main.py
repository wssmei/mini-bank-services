from fastapi import FastAPI

from app.api.errors import enregistrer_gestionnaires_erreurs
from app.api.v1.router import api_router


def create_app() -> FastAPI:
    app = FastAPI(title="BankServices", version="1.0.0")
    enregistrer_gestionnaires_erreurs(app)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
