import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.errors import enregistrer_gestionnaires_erreurs, statut_pour
from app.core.exceptions import (
    BankError,
    CompteIntrouvableError,
    FondsInsuffisantsError,
    MontantInvalideError,
    VirementInvalideError,
)
from app.main import app


def test_application_demarre_et_expose_la_documentation():
    client = TestClient(app)
    reponse = client.get("/openapi.json")
    assert reponse.status_code == 200
    assert reponse.json()["info"]["title"] == "BankServices"


@pytest.mark.parametrize("erreur, statut", [
    (CompteIntrouvableError("x"), 404),
    (FondsInsuffisantsError("x"), 422),
    (MontantInvalideError("x"), 400),
    (VirementInvalideError("x"), 400),
    (BankError("x"), 400),
])
def test_statut_http_pour_chaque_erreur_metier(erreur, statut):
    assert statut_pour(erreur) == statut


def test_erreur_metier_devient_reponse_json_avec_message():
    probe = FastAPI()
    enregistrer_gestionnaires_erreurs(probe)

    @probe.get("/echec")
    def echec():
        raise FondsInsuffisantsError("Solde insuffisant.")

    reponse = TestClient(probe).get("/echec")
    assert reponse.status_code == 422
    assert reponse.json() == {"detail": "Solde insuffisant."}
