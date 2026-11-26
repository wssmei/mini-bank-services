"""Crée les tables de la base de données.

Usage (depuis le dossier backend, avec PostgreSQL démarré et .env configuré) :
    python -m scripts.init_db

create_all ne modifie pas les tables déjà existantes. Si un modèle change,
supprimer les tables concernées avant de relancer le script.
"""

import app.models.domain  # noqa: F401  (enregistre les modèles)
from app.db.base import Base
from app.db.session import engine


def main() -> None:
    Base.metadata.create_all(engine)
    print("Tables prêtes :", ", ".join(sorted(Base.metadata.tables)))


if __name__ == "__main__":
    main()
