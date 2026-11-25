from decimal import Decimal

import pytest

from app.models.domain import Client, CompteEpargne, Transaction, TypeOperation
from app.services.fonctionnel import (
    calculerFrais,
    filtrerParType,
    totaliserFraisSimules,
    totaliserParType,
    versAffichage,
)
from app.services.operations import calculerSolde, calculerTotalOperations, effectuerDepot


def txn(type_operation, montant, solde_apres="0.00"):
    return Transaction(
        type_operation=type_operation,
        montant=Decimal(montant),
        solde_apres=Decimal(solde_apres),
    )


def historique():
    return [
        txn(TypeOperation.DEPOT, "100.00", "100.00"),
        txn(TypeOperation.RETRAIT, "30.00", "70.00"),
        txn(TypeOperation.DEPOT, "250.50", "320.50"),
        txn(TypeOperation.VIREMENT_DEBIT, "20.00", "300.50"),
        txn(TypeOperation.RETRAIT, "12000.00", "-11699.50"),
    ]


def etat(operations):
    """Photographie des attributs : permet de détecter toute modification."""
    return [(op.type_operation, op.montant, op.solde_apres) for op in operations]


# --- filter ---

def test_filtrer_ne_garde_que_le_type_demande_dans_l_ordre():
    resultat = filtrerParType(historique(), TypeOperation.DEPOT)
    assert [op.montant for op in resultat] == [Decimal("100.00"), Decimal("250.50")]
    assert all(op.type_operation == TypeOperation.DEPOT for op in resultat)


def test_filtrer_type_absent_renvoie_liste_vide():
    assert filtrerParType(historique(), TypeOperation.VIREMENT_CREDIT) == []


# --- map ---

def test_versaffichage_une_ligne_par_operation_avec_montants_formates():
    lignes = versAffichage(historique())
    assert len(lignes) == 5
    assert lignes[0] == {
        "type": "DEPOT",
        "montant": "100.00",
        "solde_apres": "100.00",
        "date": None,
    }


# --- reduce ---

def test_totaliser_par_type():
    assert totaliserParType(historique(), TypeOperation.DEPOT) == Decimal("350.50")
    assert totaliserParType(historique(), TypeOperation.RETRAIT) == Decimal("12030.00")


@pytest.mark.parametrize("type_operation", list(TypeOperation))
def test_version_fonctionnelle_egale_version_imperative(type_operation):
    """Même résultat qu'avec la boucle for de calculerTotalOperations."""
    ops = historique()
    assert totaliserParType(ops, type_operation) == calculerTotalOperations(ops, type_operation)


# --- fonction pure : frais simulés ---

def test_frais_simules_arrondis_au_centime():
    assert calculerFrais(Decimal("12000")) == Decimal("120.00")
    assert calculerFrais(Decimal("12.50")) == Decimal("0.13")  # 0.125 arrondi vers le haut


def test_frais_meme_resultat_pour_memes_arguments():
    assert calculerFrais(Decimal("999.99")) == calculerFrais(Decimal("999.99"))


@pytest.mark.parametrize("taux", [Decimal("-0.1"), Decimal("2")])
def test_frais_taux_hors_intervalle_refuse(taux):
    with pytest.raises(ValueError):
        calculerFrais(Decimal("100"), taux)


def test_total_frais_sur_les_retraits():
    # 30.00 -> 0.30 ; 12000.00 -> 120.00 ; total 120.30
    assert totaliserFraisSimules(historique()) == Decimal("120.30")


# --- Aucune modification des entrées ---

def test_fonctions_pures_ne_modifient_pas_leurs_entrees():
    ops = historique()
    liste_avant = list(ops)
    etat_avant = etat(ops)

    filtrerParType(ops, TypeOperation.DEPOT)
    versAffichage(ops)
    totaliserParType(ops, TypeOperation.RETRAIT)
    totaliserFraisSimules(ops)
    calculerSolde(Decimal("0"), ops)
    calculerTotalOperations(ops, TypeOperation.DEPOT)

    assert ops == liste_avant          # mêmes objets, même ordre
    assert etat(ops) == etat_avant     # aucun attribut modifié


def test_fonctions_pures_sur_historique_persiste_ne_salissent_pas_la_session(session):
    client = Client(nom="Benali", prenom="Yacine")
    compte = CompteEpargne(numero="P1", solde=Decimal("0.00"), client=client)
    session.add_all([client, compte])
    session.flush()
    effectuerDepot(compte, "100")
    effectuerDepot(compte, "50")
    session.commit()

    historique_db = compte.transactions
    etat_avant = etat(historique_db)

    filtrerParType(historique_db, TypeOperation.DEPOT)
    versAffichage(historique_db)
    totaliserParType(historique_db, TypeOperation.DEPOT)
    totaliserFraisSimules(historique_db)

    assert etat(historique_db) == etat_avant
    assert not session.dirty
    assert not session.new


def test_contraste_fonction_impure_modifie_l_etat(session):
    """Contraste : effectuerDepot modifie le compte, donc n'est pas pure."""
    client = Client(nom="Benali", prenom="Yacine")
    compte = CompteEpargne(numero="P2", solde=Decimal("0.00"), client=client)
    session.add_all([client, compte])
    session.flush()

    effectuerDepot(compte, "100")

    assert compte.solde == Decimal("100.00")
    assert compte in session.dirty
