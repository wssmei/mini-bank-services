from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models.domain  # noqa: F401  (enregistre les modèles)
from app.db.base import Base
from app.db.session import get_db
from app.main import app as application
from app.models.domain import CompteEpargne

BASE = "/api/v1/clients"


@pytest.fixture
def fabrique_session(tmp_path):
    """Base SQLite temporaire et fabrique de sessions, partagées entre le test et l'API."""
    engine = create_engine(f"sqlite:///{tmp_path / 'api.db'}")
    Base.metadata.create_all(engine)
    fabrique = sessionmaker(bind=engine, autoflush=True, expire_on_commit=False)
    yield fabrique
    engine.dispose()


@pytest.fixture
def api(fabrique_session):
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


def creer(api, nom, prenom):
    reponse = api.post(BASE, json={"nom": nom, "prenom": prenom})
    assert reponse.status_code == 201, reponse.text
    return reponse.json()


def noms(reponse):
    return [(c["nom"], c["prenom"]) for c in reponse.json()]


# --- Création ---

def test_creer_client_renvoie_201_et_le_client(api):
    reponse = api.post(BASE, json={"nom": "Benali", "prenom": "Yacine"})
    assert reponse.status_code == 201
    corps = reponse.json()
    assert isinstance(corps["id"], int)
    assert (corps["nom"], corps["prenom"]) == ("Benali", "Yacine")


def test_creer_client_refuse_un_nom_vide(api):
    reponse = api.post(BASE, json={"nom": "   ", "prenom": "Yacine"})
    assert reponse.status_code == 422


def test_creer_client_refuse_un_champ_inconnu(api):
    reponse = api.post(BASE, json={"nom": "Benali", "prenom": "Yacine", "id": 5})
    assert reponse.status_code == 422


# --- Liste et recherche ---

def test_lister_clients_trie_par_nom_puis_prenom(api):
    creer(api, "Zeroual", "Ali")
    creer(api, "Benali", "Yacine")
    creer(api, "Benali", "Amina")
    reponse = api.get(BASE)
    assert reponse.status_code == 200
    assert noms(reponse) == [("Benali", "Amina"), ("Benali", "Yacine"), ("Zeroual", "Ali")]


def test_recherche_sans_casse_sur_nom_ou_prenom(api):
    creer(api, "Benali", "Yacine")
    creer(api, "Dahmani", "Amina")
    creer(api, "Bouzid", "Karim")
    assert noms(api.get(BASE, params={"q": "amin"})) == [("Dahmani", "Amina")]
    assert noms(api.get(BASE, params={"q": "BENALI"})) == [("Benali", "Yacine")]


def test_recherche_traite_le_pourcentage_et_le_souligne_comme_du_texte(api):
    creer(api, "A_B", "X")
    creer(api, "AXB", "Y")
    assert noms(api.get(BASE, params={"q": "%"})) == []
    assert noms(api.get(BASE, params={"q": "_"})) == [("A_B", "X")]


def test_recherche_vide_renvoie_tous_les_clients(api):
    creer(api, "Benali", "Yacine")
    creer(api, "Dahmani", "Amina")
    assert len(api.get(BASE, params={"q": "   "}).json()) == 2


# --- Fiche client ---

def test_fiche_client_sans_compte_renvoie_une_liste_vide(api):
    client = creer(api, "Benali", "Yacine")
    reponse = api.get(f"{BASE}/{client['id']}")
    assert reponse.status_code == 200
    assert reponse.json()["comptes"] == []


def test_fiche_client_inclut_ses_comptes(api, fabrique_session):
    client = creer(api, "Benali", "Yacine")
    with fabrique_session() as db:
        db.add(CompteEpargne(numero="E-001", solde=Decimal("50000.00"), client_id=client["id"]))
        db.commit()

    corps = api.get(f"{BASE}/{client['id']}").json()
    assert len(corps["comptes"]) == 1
    assert corps["comptes"][0]["numero"] == "E-001"
    assert corps["comptes"][0]["solde"] == "50000.00"


def test_fiche_client_inconnu_renvoie_404_avec_message(api):
    reponse = api.get(f"{BASE}/999")
    assert reponse.status_code == 404
    assert reponse.json() == {"detail": "Aucun client d'identifiant 999."}


# --- Modification partielle ---

def test_modifier_un_seul_champ_garde_l_autre(api):
    client = creer(api, "Benali", "Yacine")
    reponse = api.patch(f"{BASE}/{client['id']}", json={"prenom": "Ali"})
    assert reponse.status_code == 200
    assert (reponse.json()["nom"], reponse.json()["prenom"]) == ("Benali", "Ali")

    relu = api.get(f"{BASE}/{client['id']}").json()
    assert (relu["nom"], relu["prenom"]) == ("Benali", "Ali")


def test_modifier_refuse_un_corps_vide(api):
    client = creer(api, "Benali", "Yacine")
    assert api.patch(f"{BASE}/{client['id']}", json={}).status_code == 422


def test_modifier_refuse_un_champ_mis_a_null(api):
    client = creer(api, "Benali", "Yacine")
    assert api.patch(f"{BASE}/{client['id']}", json={"nom": None}).status_code == 422


def test_modifier_refuse_de_changer_l_identifiant(api):
    client = creer(api, "Benali", "Yacine")
    reponse = api.patch(f"{BASE}/{client['id']}", json={"id": 99})
    assert reponse.status_code == 422
    assert api.get(f"{BASE}/{client['id']}").json()["id"] == client["id"]


def test_modifier_client_inconnu_renvoie_404(api):
    reponse = api.patch(f"{BASE}/999", json={"nom": "X"})
    assert reponse.status_code == 404
