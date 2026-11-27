"""Tests du service de statistiques : agrégats SQL, comptes vides, virements, période."""

from datetime import date, datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import func, select

from app.core.exceptions import CompteIntrouvableError, PeriodeInvalideError
from app.models.domain import CompteBancaire, Transaction, TypeOperation
from app.services import statistiques as service
from app.services.banque import Banque
from app.services.clients import creerClient
from app.services.comptes import creerCompte
from app.services.fonctionnel import filtrerParType
from app.services.historique import historiqueCompte
from app.services.operations import CENT, calculerSolde, calculerTotalOperations

FUSEAU = ZoneInfo("Africa/Algiers")


def locale(annee, mois, jour, heure=0, minute=0, seconde=0):
    """Instant saisi à l'heure d'Algérie, converti en UTC comme il est stocké."""
    return datetime(annee, mois, jour, heure, minute, seconde, tzinfo=FUSEAU).astimezone(timezone.utc)


@pytest.fixture
def jeu(session):
    """Trois comptes : A (épargne, opérations variées), B (reçoit 100), C (reçoit 50).

    Dépôts 1000 + 500 + 300 = 1800, retraits 200, virements 100 + 50 = 150.
    Soldes : A = 1450, B = 100, C = 50, total = 1600 = 1800 - 200.
    """
    client = creerClient(session, "Benali", "Yacine")
    a = creerCompte(session, client.id, "EPARGNE")
    b = creerCompte(session, client.id, "COURANT")
    c = creerCompte(session, client.id, "COURANT")  # reste sans opération propre
    banque = Banque(session)

    d1 = banque.deposer(a.id, "1000")
    r1 = banque.retirer(a.id, "200")
    d2 = banque.deposer(a.id, "500")
    v1_debit, v1_credit = banque.virer(a.id, b.id, "100")
    d3 = banque.deposer(a.id, "300")
    v2_debit, v2_credit = banque.virer(a.id, c.id, "50")

    for ligne, instant in [
        (d1, locale(2026, 11, 20, 10)),
        (r1, locale(2026, 11, 24, 23, 59, 59)),
        (d2, locale(2026, 11, 25, 0, 0, 0)),
        (v2_debit, locale(2026, 11, 25, 10)),
        (v2_credit, locale(2026, 11, 25, 10)),
        (v1_debit, locale(2026, 11, 26, 8)),
        (v1_credit, locale(2026, 11, 26, 8)),
        (d3, locale(2026, 11, 26, 20)),
    ]:
        ligne.date_operation = instant
    session.commit()

    return {"a": a.id, "b": b.id, "c": c.id}


# --- Par compte ---

def test_compte_sans_operation_renvoie_des_zeros(session):
    client = creerClient(session, "Vide", "Compte")
    compte = creerCompte(session, client.id, "COURANT")
    stats = service.statistiquesCompte(session, compte.id)
    assert stats["depots"] == {"nombre": 0, "montant": Decimal("0.00")}
    assert stats["retraits"] == {"nombre": 0, "montant": Decimal("0.00")}
    assert stats["virements_emis"] == {"nombre": 0, "montant": Decimal("0.00")}
    assert stats["virements_recus"] == {"nombre": 0, "montant": Decimal("0.00")}
    assert stats["solde_net_periode"] == Decimal("0.00")


def test_totaux_du_compte_a(session, jeu):
    stats = service.statistiquesCompte(session, jeu["a"])
    assert stats["depots"] == {"nombre": 3, "montant": Decimal("1800.00")}
    assert stats["retraits"] == {"nombre": 1, "montant": Decimal("200.00")}
    assert stats["virements_emis"] == {"nombre": 2, "montant": Decimal("150.00")}
    assert stats["virements_recus"] == {"nombre": 0, "montant": Decimal("0.00")}
    assert stats["solde_net_periode"] == Decimal("1450.00")


def test_compte_destinataire_voit_ses_virements_recus(session, jeu):
    stats = service.statistiquesCompte(session, jeu["b"])
    assert stats["virements_recus"] == {"nombre": 1, "montant": Decimal("100.00")}
    assert stats["virements_emis"] == {"nombre": 0, "montant": Decimal("0.00")}
    assert stats["solde_net_periode"] == Decimal("100.00")


def test_solde_net_sans_periode_egal_au_solde_stocke_et_au_calcul_python(session, jeu):
    """Contrôle croisé : SQL, solde stocké et recalcul Python doivent concorder."""
    for cle in ("a", "b", "c"):
        compte = session.get(CompteBancaire, jeu[cle])
        stats = service.statistiquesCompte(session, jeu[cle])
        recalcule = calculerSolde(Decimal("0.00"), historiqueCompte(session, jeu[cle]))
        assert stats["solde_net_periode"] == compte.solde == recalcule, cle


def test_totaux_sql_egaux_aux_fonctions_python(session, jeu):
    """Chaque total SQL est égal au même total calculé en Python sur l'historique."""
    for cle in ("a", "b", "c"):
        lignes = historiqueCompte(session, jeu[cle])
        stats = service.statistiquesCompte(session, jeu[cle])
        for type_op, cle_stats in [
            (TypeOperation.DEPOT, "depots"),
            (TypeOperation.RETRAIT, "retraits"),
            (TypeOperation.VIREMENT_DEBIT, "virements_emis"),
            (TypeOperation.VIREMENT_CREDIT, "virements_recus"),
        ]:
            assert stats[cle_stats]["nombre"] == len(filtrerParType(lignes, type_op)), (cle, type_op)
            assert stats[cle_stats]["montant"] == calculerTotalOperations(lignes, type_op), (cle, type_op)


def test_periode_limitee_au_jour_local(session, jeu):
    """Le 25 (heure locale) : dépôt 500 et virement émis 50 seulement."""
    stats = service.statistiquesCompte(session, jeu["a"], date(2026, 11, 25), date(2026, 11, 25))
    assert stats["depots"] == {"nombre": 1, "montant": Decimal("500.00")}
    assert stats["retraits"] == {"nombre": 0, "montant": Decimal("0.00")}
    assert stats["virements_emis"] == {"nombre": 1, "montant": Decimal("50.00")}
    assert stats["solde_net_periode"] == Decimal("450.00")


def test_periode_sans_operation_renvoie_des_zeros(session, jeu):
    stats = service.statistiquesCompte(session, jeu["a"], date(2030, 1, 1), date(2030, 12, 31))
    assert stats["depots"]["nombre"] == 0
    assert stats["solde_net_periode"] == Decimal("0.00")


# --- Globales ---

def test_totaux_globaux(session, jeu):
    stats = service.statistiquesGlobales(session)
    assert stats["nombre_comptes"] == 3
    assert stats["depots"] == {"nombre": 3, "montant": Decimal("1800.00")}
    assert stats["retraits"] == {"nombre": 1, "montant": Decimal("200.00")}
    assert stats["solde_total_actuel"] == Decimal("1600.00")


def test_virement_compte_une_seule_fois_au_global(session, jeu):
    """Deux virements (100 et 50) donnent 2 opérations pour 150, jamais 300 ni 4 lignes."""
    stats = service.statistiquesGlobales(session)
    assert stats["virements"] == {"nombre": 2, "montant": Decimal("150.00")}


def test_depots_moins_retraits_egalent_somme_des_soldes(session, jeu):
    """Les virements s'annulent : ils ne changent pas le total de la banque."""
    stats = service.statistiquesGlobales(session)
    assert stats["depots"]["montant"] - stats["retraits"]["montant"] == stats["solde_total_actuel"]


def test_virements_debit_et_credit_s_equilibrent_dans_la_base(session, jeu):
    debits = session.scalar(
        select(func.sum(Transaction.montant)).where(Transaction.type_operation == TypeOperation.VIREMENT_DEBIT)
    )
    credits = session.scalar(
        select(func.sum(Transaction.montant)).where(Transaction.type_operation == TypeOperation.VIREMENT_CREDIT)
    )
    assert debits == credits == Decimal("150.00")


def test_globales_periode_ne_change_pas_le_solde_total(session, jeu):
    stats = service.statistiquesGlobales(session, date(2026, 11, 25), date(2026, 11, 25))
    assert stats["depots"] == {"nombre": 1, "montant": Decimal("500.00")}
    assert stats["virements"] == {"nombre": 1, "montant": Decimal("50.00")}
    assert stats["solde_total_actuel"] == Decimal("1600.00")


def test_base_vide(session):
    stats = service.statistiquesGlobales(session)
    assert stats == {
        "nombre_comptes": 0,
        "depots": {"nombre": 0, "montant": Decimal("0.00")},
        "retraits": {"nombre": 0, "montant": Decimal("0.00")},
        "virements": {"nombre": 0, "montant": Decimal("0.00")},
        "solde_total_actuel": Decimal("0.00"),
    }


def test_globales_incluent_les_comptes_sans_operation(session, jeu):
    client = creerClient(session, "Autre", "Client")
    creerCompte(session, client.id, "EPARGNE")
    stats = service.statistiquesGlobales(session)
    assert stats["nombre_comptes"] == 4
    assert stats["depots"]["montant"] == Decimal("1800.00")


def test_montants_sont_des_decimal_au_centime(session, jeu):
    stats = service.statistiquesGlobales(session)
    for valeur in (stats["depots"]["montant"], stats["retraits"]["montant"], stats["solde_total_actuel"]):
        assert isinstance(valeur, Decimal)
        assert valeur == valeur.quantize(CENT)


# --- Erreurs et lecture seule ---

def test_periode_inversee_refusee(session, jeu):
    with pytest.raises(PeriodeInvalideError):
        service.statistiquesGlobales(session, date(2026, 11, 26), date(2026, 11, 20))
    with pytest.raises(PeriodeInvalideError):
        service.statistiquesCompte(session, jeu["a"], date(2026, 11, 26), date(2026, 11, 20))


def test_compte_inconnu_leve_erreur(session):
    with pytest.raises(CompteIntrouvableError):
        service.statistiquesCompte(session, 999)


def test_statistiques_ne_modifient_rien(session, jeu):
    avant = service.statistiquesGlobales(session)
    service.statistiquesCompte(session, jeu["a"], date(2026, 11, 25), date(2026, 11, 26))
    service.statistiquesGlobales(session, date(2026, 11, 25), date(2026, 11, 25))
    assert not session.dirty
    assert service.statistiquesGlobales(session) == avant
