from decimal import Decimal

from app.services.banque import Banque

CLIENTS = "/api/v1/clients"
COMPTES = "/api/v1/comptes"


def creer_client(api, nom="Benali", prenom="Yacine"):
    reponse = api.post(CLIENTS, json={"nom": nom, "prenom": prenom})
    assert reponse.status_code == 201, reponse.text
    return reponse.json()["id"]


def creer_compte(api, client_id, type_compte="COURANT", numero=None):
    corps = {"client_id": client_id, "type_compte": type_compte}
    if numero is not None:
        corps["numero"] = numero
    reponse = api.post(COMPTES, json=corps)
    assert reponse.status_code == 201, reponse.text
    return reponse.json()


# --- Création ---

def test_creer_compte_courant_renvoie_201_avec_solde_zero(api):
    client_id = creer_client(api)
    compte = creer_compte(api, client_id, "COURANT")
    assert compte["type_compte"] == "COURANT"
    assert compte["solde"] == "0.00"
    assert compte["client_id"] == client_id
    assert compte["numero"].startswith("CRT-")


def test_creer_compte_epargne(api):
    compte = creer_compte(api, creer_client(api), "EPARGNE")
    assert compte["type_compte"] == "EPARGNE"
    assert compte["numero"].startswith("EPG-")


def test_numero_fourni_est_conserve(api):
    compte = creer_compte(api, creer_client(api), numero="CC-2026-001")
    assert compte["numero"] == "CC-2026-001"


def test_numero_duplique_renvoie_409(api):
    client_id = creer_client(api)
    creer_compte(api, client_id, numero="CC-001")
    reponse = api.post(COMPTES, json={"client_id": client_id, "type_compte": "COURANT", "numero": "CC-001"})
    assert reponse.status_code == 409
    assert "CC-001" in reponse.json()["detail"]


def test_creer_compte_pour_client_inconnu_renvoie_404(api):
    reponse = api.post(COMPTES, json={"client_id": 999, "type_compte": "COURANT"})
    assert reponse.status_code == 404


def test_type_interne_base_refuse(api):
    client_id = creer_client(api)
    reponse = api.post(COMPTES, json={"client_id": client_id, "type_compte": "BASE"})
    assert reponse.status_code == 422


def test_solde_impose_a_la_creation_refuse(api):
    client_id = creer_client(api)
    reponse = api.post(COMPTES, json={"client_id": client_id, "type_compte": "COURANT", "solde": "1000000"})
    assert reponse.status_code == 422


def test_numero_invalide_refuse(api):
    client_id = creer_client(api)
    reponse = api.post(COMPTES, json={"client_id": client_id, "type_compte": "COURANT", "numero": "a b"})
    assert reponse.status_code == 422


# --- Consultation ---

def test_detail_compte_renvoie_les_informations(api):
    client_id = creer_client(api)
    compte = creer_compte(api, client_id, "EPARGNE", numero="EP-42")
    reponse = api.get(f"{COMPTES}/{compte['id']}")
    assert reponse.status_code == 200
    corps = reponse.json()
    assert (corps["numero"], corps["type_compte"], corps["client_id"]) == ("EP-42", "EPARGNE", client_id)


def test_solde_seul_apres_depot(api, fabrique_session):
    compte = creer_compte(api, creer_client(api), "EPARGNE")
    with fabrique_session() as db:
        Banque(db).deposer(compte["id"], "1500.50")

    reponse = api.get(f"{COMPTES}/{compte['id']}/solde")
    assert reponse.status_code == 200
    assert reponse.json() == {"compte_id": compte["id"], "solde": "1500.50"}


def test_detail_compte_inconnu_renvoie_404(api):
    reponse = api.get(f"{COMPTES}/999")
    assert reponse.status_code == 404
    assert reponse.json() == {"detail": "Aucun compte d'identifiant 999."}


def test_solde_compte_inconnu_renvoie_404(api):
    assert api.get(f"{COMPTES}/999/solde").status_code == 404


def test_courant_et_epargne_sont_distingues(api):
    client_id = creer_client(api)
    courant = creer_compte(api, client_id, "COURANT")
    epargne = creer_compte(api, client_id, "EPARGNE")
    assert api.get(f"{COMPTES}/{courant['id']}").json()["type_compte"] == "COURANT"
    assert api.get(f"{COMPTES}/{epargne['id']}").json()["type_compte"] == "EPARGNE"


def test_compte_cree_apparait_dans_la_fiche_du_client(api):
    client_id = creer_client(api)
    compte = creer_compte(api, client_id, "COURANT")
    fiche = api.get(f"{CLIENTS}/{client_id}").json()
    assert [c["id"] for c in fiche["comptes"]] == [compte["id"]]
