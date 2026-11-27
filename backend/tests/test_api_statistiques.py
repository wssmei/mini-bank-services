"""Tests de l'API de statistiques : GET /statistiques et GET /comptes/{id}/statistiques."""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pytest

from app.models.domain import Transaction

CLIENTS = "/api/v1/clients"
COMPTES = "/api/v1/comptes"
VIREMENTS = "/api/v1/virements"
STATS = "/api/v1/statistiques"


def locale(annee, mois, jour, heure=0, minute=0, seconde=0):
    return datetime(annee, mois, jour, heure, minute, seconde, tzinfo=ZoneInfo("Africa/Algiers")).astimezone(timezone.utc)


def creer_client(api):
    return api.post(CLIENTS, json={"nom": "Benali", "prenom": "Yacine"}).json()["id"]


def creer_compte(api, client_id, type_compte="EPARGNE"):
    reponse = api.post(COMPTES, json={"client_id": client_id, "type_compte": type_compte})
    assert reponse.status_code == 201, reponse.text
    return reponse.json()["id"]


def depot(api, compte, montant):
    reponse = api.post(f"{COMPTES}/{compte}/depots", json={"montant": montant})
    assert reponse.status_code == 201, reponse.text
    return reponse.json()["id"]


def retrait(api, compte, montant):
    reponse = api.post(f"{COMPTES}/{compte}/retraits", json={"montant": montant})
    assert reponse.status_code == 201, reponse.text
    return reponse.json()["id"]


def virement(api, source, destination, montant):
    reponse = api.post(VIREMENTS, json={"source_id": source, "destination_id": destination, "montant": montant})
    assert reponse.status_code == 201, reponse.text
    corps = reponse.json()
    return corps["debit"]["id"], corps["credit"]["id"]


def fixer_dates(fabrique_session, paires):
    with fabrique_session() as db:
        for tx_id, instant in paires:
            db.get(Transaction, tx_id).date_operation = instant
        db.commit()


@pytest.fixture
def donnees(api, fabrique_session):
    """Même jeu que les tests de service : A=1450, B=100, C=50 ; dépôts 1800, retraits 200, virements 150."""
    client = creer_client(api)
    a = creer_compte(api, client, "EPARGNE")
    b = creer_compte(api, client, "COURANT")
    c = creer_compte(api, client, "COURANT")

    d1 = depot(api, a, "1000")
    r1 = retrait(api, a, "200")
    d2 = depot(api, a, "500")
    v1_debit, v1_credit = virement(api, a, b, "100")
    d3 = depot(api, a, "300")
    v2_debit, v2_credit = virement(api, a, c, "50")

    fixer_dates(fabrique_session, [
        (d1, locale(2026, 11, 20, 10)),
        (r1, locale(2026, 11, 24, 23, 59, 59)),
        (d2, locale(2026, 11, 25, 0, 0, 0)),
        (v2_debit, locale(2026, 11, 25, 10)),
        (v2_credit, locale(2026, 11, 25, 10)),
        (v1_debit, locale(2026, 11, 26, 8)),
        (v1_credit, locale(2026, 11, 26, 8)),
        (d3, locale(2026, 11, 26, 20)),
    ])
    return {"a": a, "b": b, "c": c}


# --- Statistiques globales ---

def test_globales_base_vide(api):
    corps = api.get(STATS).json()
    assert corps == {
        "nombre_comptes": 0,
        "depots": {"nombre": 0, "montant": "0.00"},
        "retraits": {"nombre": 0, "montant": "0.00"},
        "virements": {"nombre": 0, "montant": "0.00"},
        "solde_total_actuel": "0.00",
    }


def test_globales_valeurs_en_texte_decimal(api, donnees):
    corps = api.get(STATS).json()
    assert corps["nombre_comptes"] == 3
    assert corps["depots"] == {"nombre": 3, "montant": "1800.00"}
    assert corps["retraits"] == {"nombre": 1, "montant": "200.00"}
    assert corps["solde_total_actuel"] == "1600.00"


def test_globales_virement_compte_une_fois(api, donnees):
    corps = api.get(STATS).json()
    assert corps["virements"] == {"nombre": 2, "montant": "150.00"}


def test_globales_filtre_de_periode(api, donnees):
    corps = api.get(STATS, params={"date_debut": "2026-11-25", "date_fin": "2026-11-25"}).json()
    assert corps["depots"] == {"nombre": 1, "montant": "500.00"}
    assert corps["retraits"] == {"nombre": 0, "montant": "0.00"}
    assert corps["virements"] == {"nombre": 1, "montant": "50.00"}
    assert corps["solde_total_actuel"] == "1600.00"


def test_globales_periode_inversee_renvoie_400(api, donnees):
    reponse = api.get(STATS, params={"date_debut": "2026-11-26", "date_fin": "2026-11-20"})
    assert reponse.status_code == 400
    assert "date de début" in reponse.json()["detail"]


def test_globales_date_invalide_renvoie_422(api):
    assert api.get(STATS, params={"date_debut": "2026-02-30"}).status_code == 422


# --- Statistiques par compte ---

def test_compte_totaux_et_solde_net(api, donnees):
    corps = api.get(f"{COMPTES}/{donnees['a']}/statistiques").json()
    assert corps["compte_id"] == donnees["a"]
    assert corps["depots"] == {"nombre": 3, "montant": "1800.00"}
    assert corps["retraits"] == {"nombre": 1, "montant": "200.00"}
    assert corps["virements_emis"] == {"nombre": 2, "montant": "150.00"}
    assert corps["virements_recus"] == {"nombre": 0, "montant": "0.00"}
    assert corps["solde_net_periode"] == "1450.00"


def test_compte_solde_net_egal_au_solde_affiche(api, donnees):
    stats = api.get(f"{COMPTES}/{donnees['a']}/statistiques").json()
    solde = api.get(f"{COMPTES}/{donnees['a']}/solde").json()["solde"]
    assert stats["solde_net_periode"] == solde == "1450.00"


def test_compte_destinataire_recus(api, donnees):
    corps = api.get(f"{COMPTES}/{donnees['b']}/statistiques").json()
    assert corps["virements_recus"] == {"nombre": 1, "montant": "100.00"}
    assert corps["solde_net_periode"] == "100.00"


def test_compte_sans_operation_renvoie_des_zeros(api, donnees):
    compte_vide = creer_compte(api, creer_client(api), "COURANT")
    corps = api.get(f"{COMPTES}/{compte_vide}/statistiques").json()
    assert corps["depots"] == {"nombre": 0, "montant": "0.00"}
    assert corps["virements_recus"] == {"nombre": 0, "montant": "0.00"}
    assert corps["solde_net_periode"] == "0.00"


def test_compte_filtre_de_periode(api, donnees):
    corps = api.get(
        f"{COMPTES}/{donnees['a']}/statistiques",
        params={"date_debut": "2026-11-25", "date_fin": "2026-11-25"},
    ).json()
    assert corps["depots"] == {"nombre": 1, "montant": "500.00"}
    assert corps["virements_emis"] == {"nombre": 1, "montant": "50.00"}
    assert corps["solde_net_periode"] == "450.00"


def test_compte_inconnu_renvoie_404(api):
    assert api.get(f"{COMPTES}/999/statistiques").status_code == 404


def test_compte_periode_inversee_renvoie_400(api, donnees):
    reponse = api.get(
        f"{COMPTES}/{donnees['a']}/statistiques",
        params={"date_debut": "2026-11-26", "date_fin": "2026-11-20"},
    )
    assert reponse.status_code == 400


def test_compte_date_invalide_renvoie_422(api, donnees):
    reponse = api.get(f"{COMPTES}/{donnees['a']}/statistiques", params={"date_fin": "pas-une-date"})
    assert reponse.status_code == 422
