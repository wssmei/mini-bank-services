import pytest
from sqlalchemy import func, select

from app.models.domain import Transaction

CLIENTS = "/api/v1/clients"
COMPTES = "/api/v1/comptes"
VIREMENTS = "/api/v1/virements"


def creer_client(api):
    return api.post(CLIENTS, json={"nom": "Benali", "prenom": "Yacine"}).json()["id"]


def creer_compte(api, client_id, type_compte="EPARGNE"):
    reponse = api.post(COMPTES, json={"client_id": client_id, "type_compte": type_compte})
    assert reponse.status_code == 201, reponse.text
    return reponse.json()["id"]


def solde(api, compte_id):
    return api.get(f"{COMPTES}/{compte_id}/solde").json()["solde"]


def nombre_transactions(fabrique_session):
    with fabrique_session() as db:
        return db.scalar(select(func.count()).select_from(Transaction))


# --- Dépôts ---

def test_depot_renvoie_201_et_la_transaction(api):
    compte = creer_compte(api, creer_client(api))
    reponse = api.post(f"{COMPTES}/{compte}/depots", json={"montant": "12000"})
    assert reponse.status_code == 201
    corps = reponse.json()
    assert corps["type_operation"] == "DEPOT"
    assert corps["montant"] == "12000.00"
    assert corps["solde_apres"] == "12000.00"
    assert corps["compte_id"] == compte


def test_depot_met_a_jour_le_solde(api):
    compte = creer_compte(api, creer_client(api))
    api.post(f"{COMPTES}/{compte}/depots", json={"montant": "12000"})
    assert solde(api, compte) == "12000.00"


def test_depot_montant_invalide_renvoie_400(api):
    compte = creer_compte(api, creer_client(api))
    for montant in ["0", "-5", "abc", "10.555"]:
        reponse = api.post(f"{COMPTES}/{compte}/depots", json={"montant": montant})
        assert reponse.status_code == 400, montant
    assert solde(api, compte) == "0.00"


def test_depot_nombre_json_renvoie_422(api):
    compte = creer_compte(api, creer_client(api))
    reponse = api.post(f"{COMPTES}/{compte}/depots", json={"montant": 12000})
    assert reponse.status_code == 422


def test_depot_compte_inconnu_renvoie_404(api):
    reponse = api.post(f"{COMPTES}/999/depots", json={"montant": "100"})
    assert reponse.status_code == 404


# --- Retraits ---

def test_retrait_exemple_du_sujet(api):
    compte = creer_compte(api, creer_client(api), "EPARGNE")
    api.post(f"{COMPTES}/{compte}/depots", json={"montant": "50000"})
    reponse = api.post(f"{COMPTES}/{compte}/retraits", json={"montant": "12000"})
    assert reponse.status_code == 201
    assert reponse.json()["type_operation"] == "RETRAIT"
    assert solde(api, compte) == "38000.00"


def test_retrait_sans_fonds_renvoie_422_et_ne_change_rien(api, fabrique_session):
    compte = creer_compte(api, creer_client(api), "EPARGNE")
    api.post(f"{COMPTES}/{compte}/depots", json={"montant": "50000"})
    avant = nombre_transactions(fabrique_session)

    reponse = api.post(f"{COMPTES}/{compte}/retraits", json={"montant": "60000"})

    assert reponse.status_code == 422
    assert "Retrait refusé" in reponse.json()["detail"]
    assert solde(api, compte) == "50000.00"
    assert nombre_transactions(fabrique_session) == avant


def test_courant_utilise_le_decouvert(api):
    compte = creer_compte(api, creer_client(api), "COURANT")
    reponse = api.post(f"{COMPTES}/{compte}/retraits", json={"montant": "5000"})
    assert reponse.status_code == 201
    assert solde(api, compte) == "-5000.00"


def test_courant_au_dela_du_decouvert_renvoie_422(api):
    compte = creer_compte(api, creer_client(api), "COURANT")
    reponse = api.post(f"{COMPTES}/{compte}/retraits", json={"montant": "5000.01"})
    assert reponse.status_code == 422
    assert solde(api, compte) == "0.00"


def test_retrait_compte_inconnu_renvoie_404(api):
    assert api.post(f"{COMPTES}/999/retraits", json={"montant": "100"}).status_code == 404


# --- Virements ---

def test_virement_renvoie_debit_et_credit(api):
    client = creer_client(api)
    source = creer_compte(api, client, "EPARGNE")
    destination = creer_compte(api, client, "COURANT")
    api.post(f"{COMPTES}/{source}/depots", json={"montant": "50000"})

    reponse = api.post(VIREMENTS, json={"source_id": source, "destination_id": destination, "montant": "12000"})

    assert reponse.status_code == 201
    corps = reponse.json()
    assert corps["debit"]["type_operation"] == "VIREMENT_DEBIT"
    assert corps["credit"]["type_operation"] == "VIREMENT_CREDIT"
    assert corps["debit"]["montant"] == corps["credit"]["montant"] == "12000.00"
    assert solde(api, source) == "38000.00"
    assert solde(api, destination) == "12000.00"


def test_virement_sans_fonds_ne_modifie_rien(api, fabrique_session):
    client = creer_client(api)
    source = creer_compte(api, client, "EPARGNE")
    destination = creer_compte(api, client, "COURANT")
    api.post(f"{COMPTES}/{source}/depots", json={"montant": "1000"})
    avant = nombre_transactions(fabrique_session)

    reponse = api.post(VIREMENTS, json={"source_id": source, "destination_id": destination, "montant": "5000"})

    assert reponse.status_code == 422
    assert solde(api, source) == "1000.00"
    assert solde(api, destination) == "0.00"
    assert nombre_transactions(fabrique_session) == avant


# Régression : le refus d'un virement doit nommer le virement, pas le retrait.
# Les deux motifs sont couverts : solde insuffisant (épargne) et découvert dépassé (courant).
@pytest.mark.parametrize(
    "type_source, montant",
    [("EPARGNE", "1500"), ("COURANT", "6001")],
)
def test_virement_refuse_donne_un_message_explicite(api, fabrique_session, type_source, montant):
    client = creer_client(api)
    source = creer_compte(api, client, type_source)
    destination = creer_compte(api, client, "COURANT")
    api.post(f"{COMPTES}/{source}/depots", json={"montant": "1000"})
    avant = nombre_transactions(fabrique_session)

    reponse = api.post(VIREMENTS, json={"source_id": source, "destination_id": destination, "montant": montant})

    assert reponse.status_code == 422
    detail = reponse.json()["detail"]
    assert detail.startswith("Virement refusé")
    assert "solde insuffisant ou règle du compte" in detail
    assert "Retrait" not in detail
    assert solde(api, source) == "1000.00"
    assert solde(api, destination) == "0.00"
    assert nombre_transactions(fabrique_session) == avant


def test_retrait_refuse_garde_son_message_d_origine(api):
    """Le message du retrait seul ne doit pas changer avec la correction du virement."""
    compte = creer_compte(api, creer_client(api), "EPARGNE")
    api.post(f"{COMPTES}/{compte}/depots", json={"montant": "1000"})
    reponse = api.post(f"{COMPTES}/{compte}/retraits", json={"montant": "1500"})
    assert reponse.status_code == 422
    assert reponse.json()["detail"] == "Retrait refusé par la règle du compte."


def test_virement_vers_le_meme_compte_renvoie_400(api):
    compte = creer_compte(api, creer_client(api), "EPARGNE")
    api.post(f"{COMPTES}/{compte}/depots", json={"montant": "100"})
    reponse = api.post(VIREMENTS, json={"source_id": compte, "destination_id": compte, "montant": "10"})
    assert reponse.status_code == 400
    assert solde(api, compte) == "100.00"


def test_virement_vers_compte_inconnu_ne_debite_pas_la_source(api):
    compte = creer_compte(api, creer_client(api), "EPARGNE")
    api.post(f"{COMPTES}/{compte}/depots", json={"montant": "100"})
    reponse = api.post(VIREMENTS, json={"source_id": compte, "destination_id": 999, "montant": "10"})
    assert reponse.status_code == 404
    assert solde(api, compte) == "100.00"


def test_virement_identifiant_non_positif_renvoie_422(api):
    reponse = api.post(VIREMENTS, json={"source_id": 0, "destination_id": 2, "montant": "10"})
    assert reponse.status_code == 422
