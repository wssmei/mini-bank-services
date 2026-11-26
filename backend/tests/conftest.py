import os

# Valeur factice : elle permet d'importer la configuration sans fichier .env.
# Aucun test ne se connecte à cette adresse ; les tests API utilisent une base SQLite temporaire.
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost/unused_test_db")

import pytest
from sqlalchemy import create_engine
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

import app.models.domain  # noqa: F401  (enregistre les modèles)
from app.db.base import Base
from app.db.session import get_db
from app.main import app as application


@pytest.fixture
def session():
    """Session sur une base vide.

    Par défaut : SQLite en mémoire.
    Pour tester sur PostgreSQL, utiliser une base DÉDIÉE aux tests, car les tables y sont supprimées :
    TEST_DATABASE_URL=postgresql+psycopg://user:motdepasse@localhost/bankservices_test
    """
    url = os.environ.get("TEST_DATABASE_URL", "sqlite://")
    engine = create_engine(url)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def fabrique_session(tmp_path):
    """Base SQLite temporaire, partagée entre le test et l'API."""
    engine = create_engine(f"sqlite:///{tmp_path / 'api.db'}")
    Base.metadata.create_all(engine)
    fabrique = sessionmaker(bind=engine, autoflush=True, expire_on_commit=False)
    yield fabrique
    engine.dispose()


@pytest.fixture
def api(fabrique_session):
    """Client HTTP de test : chaque requête reçoit une session de la base temporaire."""

    def _get_db():
        db = fabrique_session()
        try:
            yield db
        finally:
            db.close()

    application.dependency_overrides[get_db] = _get_db
    with TestClient(application) as client:
        yield client
    application.dependency_overrides.clear()
