"""Tests du service d'historique : bornes de fuseau, filtres, erreurs, lecture seule."""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

import pytest

from app.core.exceptions import CompteIntrouvableError, PeriodeInvalideError
from app.models.domain import TypeOperation
from app.services import historique as service
from app.services.banque import Banque
from app.services.clients import creerClient
from app.services.comptes import creerCompte
from app.services.fonctionnel import filtrerParType

FUSEAU = ZoneInfo("Africa/Algiers")


def locale(annee, mois, jour, heure=0, minute=0, seconde=0):
    """Instant saisi à l'heure d'Algérie, converti en UTC comme il est stocké."""
    return datetime(annee, mois, jour, heure, minute, seconde, tzinfo=FUSEAU).astimezone(timezone.utc)


def ids(lignes):
    return [ligne.id for ligne in lignes]


@pytest.fixture
def jeu(session):
    """Un compte épargne avec 5 opérations datées, et un compte courant destinataire du virement."""
    client = creerClient(session, "Benali", "Yacine")
    compte = creerCompte(session, client.id, "EPARGNE")
    autre = creerCompte(session, client.id, "COURANT")
    banque = Banque(session)

    d1 = banque.deposer(compte.id, "1000")
    r1 = banque.retirer(compte.id, "200")
    d2 = banque.deposer(compte.id, "500")
    debit, credit = banque.virer(compte.id, autre.id, "100")
    d3 = banque.deposer(compte.id, "300")

    datees = [
        (d1, locale(2026, 11, 20, 10)),
        (r1, locale(2026, 11, 24, 23, 59, 59)),   # dernière seconde du 24 (heure locale)
        (d2, locale(2026, 11, 25, 0, 0, 0)),      # minuit pile, début du 25
        (debit, locale(2026, 11, 26, 8)),
        (credit, locale(2026, 11, 26, 8)),
        (d3, locale(2026, 11, 26, 20)),
    ]
    for ligne, instant in datees:
        ligne.date_operation = instant
    session.commit()

    return {
        "compte": compte.id,
        "autre": autre.id,
        "d1": d1.id, "r1": r1.id, "d2": d2.id,
        "debit": debit.id, "credit": credit.id, "d3": d3.id,
    }


# --- Bornes de fuseau (fonctions pures) ---

def test_bornes_jour_unique_correspondent_a_minuit_algerie():
    debut, fin = service.bornesUtc(date(2026, 11, 25), date(2026, 11, 25))
    assert debut == locale(2026, 11, 25)
    assert fin == locale(2026, 11, 26)
    assert debut.utcoffset().total_seconds() == 0  # bornes exprimées en UTC


def test_bornes_sans_periode_sont_ouvertes():
    assert service.bornesUtc(None, None) == (None, None)


def test_bornes_periode_partielle():
    assert service.bornesUtc(date(2026, 11, 25), None) == (locale(2026, 11, 25), None)
    assert service.bornesUtc(None, date(2026, 11, 25)) == (None, locale(2026, 11, 26))


def test_bornes_extremes_ne_plantent_pas_et_restent_ouvertes():
    assert service.bornesUtc(date.min, date.max) == (None, None)


# --- Service historiqueCompte ---

def test_historique_ordre_antichronologique_et_compte_seul(session, jeu):
    lignes = service.historiqueCompte(session, jeu["compte"])
    assert ids(lignes) == [jeu["d3"], jeu["debit"], jeu["d2"], jeu["r1"], jeu["d1"]]


def test_periode_inversee_refusee(session, jeu):
    with pytest.raises(PeriodeInvalideError):
        service.historiqueCompte(
            session, jeu["compte"], date_debut=date(2026, 11, 26), date_fin=date(2026, 11, 20)
        )


def test_compte_inconnu_leve_erreur(session):
    with pytest.raises(CompteIntrouvableError):
        service.historiqueCompte(session, 999)


def test_resultat_identique_au_filtre_en_memoire(session, jeu):
    """Le filtre SQL donne le même résultat que filtrerParType appliqué à l'historique complet."""
    toutes = service.historiqueCompte(session, jeu["compte"])
    for type_op in TypeOperation:
        attendu = ids(filtrerParType(toutes, type_op))
        obtenu = ids(service.historiqueCompte(session, jeu["compte"], type_operation=type_op))
        assert obtenu == attendu, type_op


def test_lecture_seule_ne_modifie_ni_la_session_ni_les_lignes(session, jeu):
    def photo():
        return [(t.id, t.montant, t.solde_apres, t.date_operation) for t in service.historiqueCompte(session, jeu["compte"])]

    avant = photo()
    service.historiqueCompte(session, jeu["compte"], TypeOperation.DEPOT, date(2026, 11, 21), date(2026, 11, 26))
    assert not session.dirty
    assert photo() == avant
