from decimal import Decimal

import pytest

from app.core.exceptions import FondsInsuffisantsError, MontantInvalideError
from app.models.domain import Client, CompteCourant, CompteEpargne, Transaction, TypeOperation
from app.services.operations import (
    calculerSolde,
    calculerTotalOperations,
    effectuerDepot,
    effectuerRetrait,
    verifierMontant,
)


def nouveau_compte(session, cls=CompteEpargne, solde="0.00", numero="T1"):
    client = Client(nom="Benali", prenom="Yacine")
    compte = cls(numero=numero, solde=Decimal(solde), client=client)
    session.add_all([client, compte])
    session.flush()
    return compte


def txn(type_operation, montant):
    """Transaction en mémoire, sans session, pour tester les calculs purs."""
    return Transaction(type_operation=type_operation, montant=Decimal(montant), solde_apres=Decimal("0"))


# --- verifierMontant ---

@pytest.mark.parametrize("valeur, attendu", [
    ("12000", Decimal("12000")),
    (Decimal("0.5"), Decimal("0.5")),
    (" 10.25 ", Decimal("10.25")),
    ("999999999999.99", Decimal("999999999999.99")),
])
def test_verifier_montant_accepte_les_valeurs_valides(valeur, attendu):
    assert verifierMontant(valeur) == attendu


@pytest.mark.parametrize("valeur", [
    0, "0", "-5", "abc", "", 10.5, True, "10.555", "NaN", "1000000000000",
])
def test_verifier_montant_refuse_les_valeurs_invalides(valeur):
    with pytest.raises(MontantInvalideError):
        verifierMontant(valeur)


# --- effectuerDepot / effectuerRetrait ---

def test_depot_augmente_le_solde_et_enregistre_la_transaction(session):
    compte = nouveau_compte(session, solde="50000.00")
    tx = effectuerDepot(compte, "12000")
    assert compte.solde == Decimal("62000.00")
    assert tx.type_operation == TypeOperation.DEPOT
    assert tx.montant == Decimal("12000")
    assert tx.solde_apres == Decimal("62000.00")


def test_depot_invalide_ne_modifie_rien(session):
    compte = nouveau_compte(session, solde="50000.00")
    with pytest.raises(MontantInvalideError):
        effectuerDepot(compte, "0")
    assert compte.solde == Decimal("50000.00")
    assert compte.transactions == []


def test_retrait_exemple_du_sujet(session):
    # Exemple de l'énoncé : solde 50 000 DA, retrait de 12 000 DA
    compte = nouveau_compte(session, solde="50000.00")
    effectuerRetrait(compte, "12000")
    assert compte.solde == Decimal("38000.00")


def test_retrait_refuse_ne_modifie_ni_solde_ni_historique(session):
    compte = nouveau_compte(session, solde="50000.00")
    with pytest.raises(FondsInsuffisantsError):
        effectuerRetrait(compte, "60000")
    assert compte.solde == Decimal("50000.00")
    assert compte.transactions == []


def test_retrait_courant_utilise_le_decouvert(session):
    compte = nouveau_compte(session, cls=CompteCourant, solde="1000.00")
    effectuerRetrait(compte, "6000")  # 1000 - 6000 = -5000 : limite exacte
    assert compte.solde == Decimal("-5000.00")
    with pytest.raises(FondsInsuffisantsError):
        effectuerRetrait(compte, "0.01")


# --- calculerSolde / calculerTotalOperations (sur historique en mémoire) ---

def test_calculer_solde_exemple_du_sujet():
    ops = [txn(TypeOperation.DEPOT, "12000"), txn(TypeOperation.RETRAIT, "12000")]
    assert calculerSolde(Decimal("50000.00"), ops) == Decimal("50000.00")


def test_calculer_solde_avec_virements():
    ops = [
        txn(TypeOperation.VIREMENT_CREDIT, "300"),
        txn(TypeOperation.VIREMENT_DEBIT, "100"),
        txn(TypeOperation.RETRAIT, "50"),
    ]
    assert calculerSolde(Decimal("0"), ops) == Decimal("150")


def test_calculer_total_par_type():
    ops = [
        txn(TypeOperation.DEPOT, "100"),
        txn(TypeOperation.DEPOT, "250.50"),
        txn(TypeOperation.RETRAIT, "50"),
    ]
    assert calculerTotalOperations(ops, TypeOperation.DEPOT) == Decimal("350.50")
    assert calculerTotalOperations(ops, TypeOperation.RETRAIT) == Decimal("50")


def test_calculer_total_liste_vide():
    assert calculerTotalOperations([], TypeOperation.DEPOT) == Decimal("0.00")


# --- Cohérence entre solde stocké et solde recalculé à partir de l'historique ---

def test_solde_stocke_egale_solde_recalcule(session):
    compte = nouveau_compte(session, solde="0.00")
    effectuerDepot(compte, "100")
    effectuerDepot(compte, "250.50")
    effectuerRetrait(compte, "50")
    session.commit()
    assert calculerSolde(Decimal("0.00"), compte.transactions) == compte.solde
