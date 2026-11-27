from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.exceptions import FondsInsuffisantsError
from app.db.base import Base
from app.models.domain import (
    Client,
    CompteBancaire,
    CompteCourant,
    CompteEpargne,
    Transaction,
    TypeOperation,
)


@pytest.fixture
def session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s
    engine.dispose()


def make_client(session):
    client = Client(nom="Benali", prenom="Yacine")
    session.add(client)
    session.flush()
    return client


# --- Règle de retrait : compte courant (découvert autorisé jusqu'à 5 000) ---

def test_courant_retrait_dans_le_solde(session):
    c = CompteCourant(numero="C1", solde=Decimal("1000.00"), client=make_client(session))
    c.retirer(Decimal("1000.00"))
    assert c.solde == Decimal("0.00")


def test_courant_decouvert_jusqua_la_limite_accepte(session):
    c = CompteCourant(numero="C2", solde=Decimal("1000.00"), client=make_client(session))
    c.retirer(Decimal("6000.00"))  # 1000 - 6000 = -5000 : limite exacte
    assert c.solde == Decimal("-5000.00")


def test_courant_au_dela_du_decouvert_refuse_sans_modifier_le_solde(session):
    c = CompteCourant(numero="C3", solde=Decimal("1000.00"), client=make_client(session))
    with pytest.raises(FondsInsuffisantsError):
        c.retirer(Decimal("6000.01"))
    assert c.solde == Decimal("1000.00")


# --- Règle de retrait : compte épargne (pas de découvert, plafond 100 000) ---

def test_epargne_retrait_superieur_au_solde_refuse(session):
    e = CompteEpargne(numero="E1", solde=Decimal("50000.00"), client=make_client(session))
    with pytest.raises(FondsInsuffisantsError):
        e.retirer(Decimal("50000.01"))
    assert e.solde == Decimal("50000.00")


def test_epargne_retrait_au_dessus_du_plafond_refuse(session):
    e = CompteEpargne(numero="E2", solde=Decimal("500000.00"), client=make_client(session))
    with pytest.raises(FondsInsuffisantsError):
        e.retirer(Decimal("100000.01"))
    assert e.solde == Decimal("500000.00")


def test_epargne_retrait_exactement_au_plafond_accepte(session):
    e = CompteEpargne(numero="E3", solde=Decimal("500000.00"), client=make_client(session))
    e.retirer(Decimal("100000.00"))
    assert e.solde == Decimal("400000.00")


# --- Polymorphisme : même méthode, comportements différents ---

def test_meme_montant_different_selon_le_type_de_compte(session):
    client = make_client(session)
    courant = CompteCourant(numero="P1", solde=Decimal("0.00"), client=client)
    epargne = CompteEpargne(numero="P2", solde=Decimal("0.00"), client=client)
    montant = Decimal("100.00")
    assert courant.peut_retirer(montant) is True   # découvert autorisé
    assert epargne.peut_retirer(montant) is False  # pas de découvert


# --- Précision décimale ---

def test_somme_decimale_exacte(session):
    c = CompteEpargne(numero="D1", solde=Decimal("0.00"), client=make_client(session))
    c.deposer(Decimal("0.10"))
    c.deposer(Decimal("0.20"))
    assert c.solde == Decimal("0.30")  # avec float : 0.30000000000000004


# --- Valeur initiale du solde ---

def test_solde_initial_zero_avant_flush(session):
    c = CompteEpargne(numero="I1", client=make_client(session))
    assert c.solde == Decimal("0.00")


# --- Persistance et chargement polymorphe ---

def test_persistance_et_chargement_du_bon_sous_type(session):
    client = make_client(session)
    session.add_all([
        CompteCourant(numero="S1", solde=Decimal("10.00"), client=client),
        CompteEpargne(numero="S2", solde=Decimal("20.00"), client=client),
    ])
    session.commit()
    session.expire_all()

    courant = session.scalar(select(CompteBancaire).where(CompteBancaire.numero == "S1"))
    epargne = session.scalar(select(CompteBancaire).where(CompteBancaire.numero == "S2"))
    assert isinstance(courant, CompteCourant)
    assert isinstance(epargne, CompteEpargne)
    assert courant.solde == Decimal("10.00")


def test_transaction_enregistree_avec_type_enum(session):
    client = make_client(session)
    c = CompteEpargne(numero="T1", solde=Decimal("0.00"), client=client)
    session.add(c)
    session.flush()
    c.deposer(Decimal("500.00"))
    session.add(Transaction(
        compte=c,
        type_operation=TypeOperation.DEPOT,
        montant=Decimal("500.00"),
        solde_apres=c.solde,
    ))
    session.commit()

    tx = session.scalar(select(Transaction))
    assert tx.type_operation == "DEPOT"
    assert tx.montant == Decimal("500.00")
    assert tx.date_operation is not None