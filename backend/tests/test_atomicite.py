from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.core.exceptions import (
    CompteIntrouvableError,
    FondsInsuffisantsError,
    MontantInvalideError,
    VirementInvalideError,
)
from app.models.domain import Client, CompteBancaire, CompteCourant, CompteEpargne, Transaction, TypeOperation
from app.services import operations
from app.services.banque import Banque


def creer_comptes(session):
    client = Client(nom="Benali", prenom="Yacine")
    source = CompteEpargne(numero="SRC", solde=Decimal("50000.00"), client=client)
    destination = CompteCourant(numero="DST", solde=Decimal("1000.00"), client=client)
    session.add_all([client, source, destination])
    session.commit()
    return source.id, destination.id


def solde_de(session, compte_id):
    session.expire_all()  # relire depuis la base, pas depuis la mémoire
    return session.get(CompteBancaire, compte_id).solde


def nombre_transactions(session):
    return session.scalar(select(func.count()).select_from(Transaction))


# --- Virement réussi ---

def test_virement_reussi_debite_et_credite_et_journalise(session):
    src, dst = creer_comptes(session)
    banque = Banque(session)

    debit, credit = banque.virer(src, dst, "12000")

    assert solde_de(session, src) == Decimal("38000.00")
    assert solde_de(session, dst) == Decimal("13000.00")
    assert debit.type_operation == TypeOperation.VIREMENT_DEBIT
    assert credit.type_operation == TypeOperation.VIREMENT_CREDIT
    assert nombre_transactions(session) == 2


# --- Échecs : aucune modification ne doit persister ---

def test_virement_sans_fonds_suffisants_ne_modifie_rien(session):
    src, dst = creer_comptes(session)
    with pytest.raises(FondsInsuffisantsError):
        Banque(session).virer(src, dst, "60000")
    assert solde_de(session, src) == Decimal("50000.00")
    assert solde_de(session, dst) == Decimal("1000.00")
    assert nombre_transactions(session) == 0


def test_panne_apres_le_debit_annule_le_debit(session, monkeypatch):
    """Test clé de l'atomicité : le débit est fait en mémoire, puis le crédit échoue.
    Le rollback doit annuler le débit : aucun des deux comptes ne doit changer."""
    src, dst = creer_comptes(session)

    original = operations.creerTransaction

    def panne_au_credit(compte, type_operation, montant):
        if type_operation == TypeOperation.VIREMENT_CREDIT:
            raise RuntimeError("panne simulée pendant le crédit")
        return original(compte, type_operation, montant)

    monkeypatch.setattr(operations, "creerTransaction", panne_au_credit)

    with pytest.raises(RuntimeError):
        Banque(session).virer(src, dst, "12000")

    assert solde_de(session, src) == Decimal("50000.00")  # le débit est annulé
    assert solde_de(session, dst) == Decimal("1000.00")
    assert nombre_transactions(session) == 0              # aucune ligne d'historique


def test_virement_vers_compte_inexistant_ne_debite_pas_la_source(session):
    src, _ = creer_comptes(session)
    with pytest.raises(CompteIntrouvableError):
        Banque(session).virer(src, 9999, "100")
    assert solde_de(session, src) == Decimal("50000.00")
    assert nombre_transactions(session) == 0


def test_virement_vers_le_meme_compte_refuse(session):
    src, _ = creer_comptes(session)
    with pytest.raises(VirementInvalideError):
        Banque(session).virer(src, src, "100")
    assert solde_de(session, src) == Decimal("50000.00")


def test_virement_montant_invalide_refuse(session):
    src, dst = creer_comptes(session)
    with pytest.raises(MontantInvalideError):
        Banque(session).virer(src, dst, "0")
    assert solde_de(session, src) == Decimal("50000.00")
    assert solde_de(session, dst) == Decimal("1000.00")


# --- Opérations simples via Banque : persistance ---

def test_depot_et_retrait_via_banque_sont_persistes(session):
    src, _ = creer_comptes(session)
    banque = Banque(session)
    banque.deposer(src, "1000")
    banque.retirer(src, "500")
    assert solde_de(session, src) == Decimal("50500.00")
    assert nombre_transactions(session) == 2
