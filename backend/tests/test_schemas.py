from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.models.domain import Transaction, TypeOperation
from app.schemas.client import ClientCreate, ClientDetail, ClientRead, ClientUpdate
from app.schemas.compte import CompteCreate, CompteRead
from app.schemas.operation import MontantOperation, TransactionRead, VirementCreate, VirementRead


# --- Clients ---

def test_client_create_nettoie_les_espaces():
    client = ClientCreate(nom="  Benali ", prenom=" Yacine")
    assert client.nom == "Benali"
    assert client.prenom == "Yacine"


def test_client_create_refuse_nom_vide_ou_blanc():
    with pytest.raises(ValidationError):
        ClientCreate(nom="   ", prenom="Yacine")


def test_client_create_refuse_champ_inconnu():
    with pytest.raises(ValidationError):
        ClientCreate(nom="Benali", prenom="Yacine", id=5)


def test_client_update_exige_au_moins_un_champ():
    with pytest.raises(ValidationError):
        ClientUpdate()


def test_client_update_refuse_un_champ_mis_a_null():
    with pytest.raises(ValidationError):
        ClientUpdate(nom=None)


def test_client_update_accepte_un_seul_champ():
    modification = ClientUpdate(prenom="Ali")
    assert modification.model_fields_set == {"prenom"}


def test_client_read_construit_depuis_un_objet_orm():
    objet = SimpleNamespace(id=1, nom="Benali", prenom="Yacine")
    assert ClientRead.model_validate(objet).nom == "Benali"


def test_client_detail_inclut_les_comptes():
    compte = SimpleNamespace(id=2, numero="C-001", type_compte="COURANT",
                             solde=Decimal("50000.00"), client_id=1)
    objet = SimpleNamespace(id=1, nom="Benali", prenom="Yacine", comptes=[compte])
    fiche = ClientDetail.model_validate(objet)
    assert len(fiche.comptes) == 1
    assert fiche.comptes[0].solde == Decimal("50000.00")


# --- Comptes ---

@pytest.mark.parametrize("type_compte", ["COURANT", "EPARGNE"])
def test_compte_create_accepte_les_deux_types_publics(type_compte):
    assert CompteCreate(client_id=1, type_compte=type_compte).type_compte == type_compte


def test_compte_create_refuse_le_type_interne_base():
    with pytest.raises(ValidationError):
        CompteCreate(client_id=1, type_compte="BASE")


def test_compte_create_refuse_un_solde_impose():
    """Le solde ne peut pas être fixé à la création : il ne change que par opération."""
    with pytest.raises(ValidationError):
        CompteCreate(client_id=1, type_compte="COURANT", solde="1000000")


@pytest.mark.parametrize("numero", ["a b", "AB", "C@001", "x" * 21])
def test_compte_create_refuse_un_numero_invalide(numero):
    with pytest.raises(ValidationError):
        CompteCreate(client_id=1, type_compte="EPARGNE", numero=numero)


def test_compte_create_numero_optionnel():
    assert CompteCreate(client_id=1, type_compte="EPARGNE").numero is None


def test_compte_create_refuse_client_id_non_positif():
    with pytest.raises(ValidationError):
        CompteCreate(client_id=0, type_compte="COURANT")


def test_compte_read_envoie_le_solde_en_texte_exact():
    objet = SimpleNamespace(id=1, numero="C-001", type_compte="COURANT",
                            solde=Decimal("50000.00"), client_id=1)
    json_ = CompteRead.model_validate(objet).model_dump(mode="json")
    assert json_["solde"] == "50000.00"


# --- Opérations ---

def test_montant_nettoie_les_espaces():
    assert MontantOperation(montant=" 12000.50 ").montant == "12000.50"


@pytest.mark.parametrize("valeur", [12000, 10.5])
def test_montant_refuse_les_nombres_json_avec_message_clair(valeur):
    with pytest.raises(ValidationError) as info:
        MontantOperation(montant=valeur)
    assert "entre guillemets" in str(info.value)


def test_montant_vide_refuse():
    with pytest.raises(ValidationError):
        MontantOperation(montant="")


def test_virement_refuse_identifiants_non_positifs():
    with pytest.raises(ValidationError):
        VirementCreate(source_id=0, destination_id=2, montant="100")


def test_virement_accepte_une_requete_valide():
    virement = VirementCreate(source_id=1, destination_id=2, montant="100.00")
    assert (virement.source_id, virement.destination_id) == (1, 2)


def _transaction(type_operation, montant, solde_apres, id_=1):
    tx = Transaction(
        type_operation=type_operation,
        montant=Decimal(montant),
        solde_apres=Decimal(solde_apres),
        date_operation=datetime(2026, 11, 26, 9, 0, tzinfo=timezone.utc),
    )
    tx.id = id_
    tx.compte_id = 1
    return tx


def test_transaction_read_envoie_type_et_montant_en_texte():
    tx = _transaction(TypeOperation.DEPOT, "12000.00", "62000.00")
    json_ = TransactionRead.model_validate(tx).model_dump(mode="json")
    assert json_["type_operation"] == "DEPOT"
    assert json_["montant"] == "12000.00"
    assert json_["solde_apres"] == "62000.00"


def test_virement_read_contient_debit_et_credit():
    debit = _transaction(TypeOperation.VIREMENT_DEBIT, "100.00", "900.00", id_=1)
    credit = _transaction(TypeOperation.VIREMENT_CREDIT, "100.00", "1100.00", id_=2)
    reponse = VirementRead.model_validate({"debit": debit, "credit": credit})
    assert reponse.debit.type_operation == "VIREMENT_DEBIT"
    assert reponse.credit.type_operation == "VIREMENT_CREDIT"
