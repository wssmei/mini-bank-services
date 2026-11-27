"""Tests de l'API d'historique : GET /api/v1/comptes/{id}/operations et ses filtres."""

import pytest

from app.models.domain import Transaction

CLIENTS = "/api/v1/clients"
COMPTES = "/api/v1/comptes"
VIREMENTS = "/api/v1/virements"


def locale(annee, mois, jour, heure=0, minute=0, seconde=0):
    """Instant saisi à l'heure d'Algérie (UTC+1), converti en UTC comme il est stocké."""
    from datetime import datetime, timezone
    from zoneinfo import ZoneInfo

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


def fixer_dates(fabrique_session, paires):
    """Fixe la date d'opération de lignes déjà créées (l'API écrit l'heure actuelle)."""
    with fabrique_session() as db:
        for tx_id, instant in paires:
            db.get(Transaction, tx_id).date_operation = instant
        db.commit()


def ids_historique(api, compte_id, **filtres):
    reponse = api.get(f"{COMPTES}/{compte_id}/operations", params=filtres)
    assert reponse.status_code == 200, reponse.text
    return [ligne["id"] for ligne in reponse.json()]


@pytest.fixture
def donnees(api, fabrique_session):
    client = creer_client(api)
    compte = creer_compte(api, client, "EPARGNE")
    autre = creer_compte(api, client, "COURANT")

    d1 = depot(api, compte, "1000")
    r1 = retrait(api, compte, "200")
    d2 = depot(api, compte, "500")
    virement = api.post(VIREMENTS, json={"source_id": compte, "destination_id": autre, "montant": "100"})
    assert virement.status_code == 201, virement.text
    debit = virement.json()["debit"]["id"]
    credit = virement.json()["credit"]["id"]
    d3 = depot(api, compte, "300")

    fixer_dates(fabrique_session, [
        (d1, locale(2026, 11, 20, 10)),
        (r1, locale(2026, 11, 24, 23, 59, 59)),
        (d2, locale(2026, 11, 25, 0, 0, 0)),
        (debit, locale(2026, 11, 26, 8)),
        (credit, locale(2026, 11, 26, 8)),
        (d3, locale(2026, 11, 26, 20)),
    ])
    return {
        "compte": compte, "autre": autre,
        "d1": d1, "r1": r1, "d2": d2, "debit": debit, "credit": credit, "d3": d3,
    }


# --- Liste complète et compte ---

def test_historique_complet_du_plus_recent_au_plus_ancien(api, donnees):
    ids = ids_historique(api, donnees["compte"])
    assert ids == [donnees["d3"], donnees["debit"], donnees["d2"], donnees["r1"], donnees["d1"]]


def test_chaque_ligne_contient_les_champs_de_transaction(api, donnees):
    corps = api.get(f"{COMPTES}/{donnees['compte']}/operations").json()
    premiere = corps[0]
    assert premiere["compte_id"] == donnees["compte"]
    assert premiere["type_operation"] == "DEPOT"
    assert premiere["montant"] == "300.00"
    assert premiere["solde_apres"] == "1500.00"


def test_compte_destinataire_ne_voit_que_ses_lignes(api, donnees):
    assert ids_historique(api, donnees["autre"]) == [donnees["credit"]]


def test_compte_sans_operation_renvoie_liste_vide(api):
    compte = creer_compte(api, creer_client(api))
    assert ids_historique(api, compte) == []


def test_compte_inconnu_renvoie_404(api):
    assert api.get(f"{COMPTES}/999/operations").status_code == 404


# --- Filtre par type ---

def test_filtre_par_type_depot(api, donnees):
    ids = ids_historique(api, donnees["compte"], type_operation="DEPOT")
    assert ids == [donnees["d3"], donnees["d2"], donnees["d1"]]


def test_filtre_par_type_virement_debit(api, donnees):
    assert ids_historique(api, donnees["compte"], type_operation="VIREMENT_DEBIT") == [donnees["debit"]]


def test_filtre_par_type_sans_resultat_renvoie_liste_vide(api, donnees):
    assert ids_historique(api, donnees["compte"], type_operation="VIREMENT_CREDIT") == []


def test_type_inconnu_renvoie_422(api, donnees):
    reponse = api.get(f"{COMPTES}/{donnees['compte']}/operations", params={"type_operation": "FOO"})
    assert reponse.status_code == 422


# --- Filtre par période (jours locaux d'Algérie) ---

def test_date_debut_inclut_le_jour_entier_en_heure_locale(api, donnees):
    # Le 25 commence à minuit local, soit 23:00 UTC le 24 : D2 est inclus, R1 (23:59:59 local le 24) non.
    ids = ids_historique(api, donnees["compte"], date_debut="2026-11-25")
    assert ids == [donnees["d3"], donnees["debit"], donnees["d2"]]


def test_date_fin_est_inclusive_et_s_arrete_a_minuit_local(api, donnees):
    # R1 est à 23:59:59 heure locale le 24 : inclus. D2 est à minuit le 25 : exclu.
    ids = ids_historique(api, donnees["compte"], date_fin="2026-11-24")
    assert ids == [donnees["r1"], donnees["d1"]]


def test_meme_jour_comme_debut_et_fin(api, donnees):
    ids = ids_historique(api, donnees["compte"], date_debut="2026-11-25", date_fin="2026-11-25")
    assert ids == [donnees["d2"]]


def test_filtres_combines_type_et_periode(api, donnees):
    ids = ids_historique(
        api, donnees["compte"],
        type_operation="DEPOT", date_debut="2026-11-21", date_fin="2026-11-26",
    )
    assert ids == [donnees["d3"], donnees["d2"]]


def test_periode_sans_operation_renvoie_liste_vide(api, donnees):
    assert ids_historique(api, donnees["compte"], date_debut="2030-01-01", date_fin="2030-12-31") == []


def test_periode_inversee_renvoie_400(api, donnees):
    reponse = api.get(
        f"{COMPTES}/{donnees['compte']}/operations",
        params={"date_debut": "2026-11-26", "date_fin": "2026-11-20"},
    )
    assert reponse.status_code == 400
    assert "date de début" in reponse.json()["detail"]


def test_date_mal_formee_renvoie_422(api, donnees):
    reponse = api.get(f"{COMPTES}/{donnees['compte']}/operations", params={"date_debut": "2026-13-01"})
    assert reponse.status_code == 422


def test_bornes_extremes_acceptees(api, donnees):
    ids = ids_historique(api, donnees["compte"], date_debut="0001-01-01", date_fin="9999-12-31")
    assert len(ids) == 5


def test_dates_renvoyees_en_utc_quel_que_soit_le_fuseau_du_serveur(api, donnees):
    # D3 est saisi à 20:00 heure d'Algérie le 26 : c'est 19:00 UTC.
    # Même instant et même écriture, que la date vienne de la base ou d'une création.
    corps = api.get(f"{COMPTES}/{donnees['compte']}/operations").json()
    assert corps[0]["date_operation"] == "2026-11-26T19:00:00Z"
