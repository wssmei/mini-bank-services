
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import enregistrer_gestionnaires_erreurs
from app.api.v1.router import api_router


def create_app() -> FastAPI:
    app = FastAPI(title="BankServices", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    enregistrer_gestionnaires_erreurs(app)
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
