class BankError(Exception):
    """Erreur métier de base."""


class MontantInvalideError(BankError):
    """Montant nul, négatif ou mal formé."""


class FondsInsuffisantsError(BankError):
    """Solde ou règle de retrait non respectée."""


class VirementInvalideError(BankError):
    """Virement entre deux comptes identiques ou invalides."""


class CompteIntrouvableError(BankError):
    """Aucun compte ne correspond à l'identifiant donné."""


class ClientIntrouvableError(BankError):
    """Aucun client ne correspond à l'identifiant donné."""


class NumeroCompteDejaUtiliseError(BankError):
    """Le numéro de compte demandé existe déjà."""


class PeriodeInvalideError(BankError):
    """Période d'historique incohérente (date de début après date de fin)."""
