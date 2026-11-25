import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.models.domain  # noqa: F401  (enregistre les modèles)
from app.db.base import Base


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
