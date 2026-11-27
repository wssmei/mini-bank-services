from decimal import Decimal

from app.schemas.base import SchemaBase


class TotalOperations(SchemaBase):
    """Nombre d'opérations et somme de leurs montants, pour un type donné."""

    nombre: int
    montant: Decimal


class StatistiquesCompte(SchemaBase):
    compte_id: int
    depots: TotalOperations
    retraits: TotalOperations
    virements_emis: TotalOperations
    virements_recus: TotalOperations
    # Variation du solde sur la période : dépôts - retraits - virements émis + virements reçus.
    # Sans période, elle égale le solde stocké du compte.
    solde_net_periode: Decimal


class StatistiquesGlobales(SchemaBase):
    nombre_comptes: int
    depots: TotalOperations
    retraits: TotalOperations
    # Un virement = une seule unité : on compte la ligne débit, jamais la ligne crédit.
    virements: TotalOperations
    # Somme des soldes actuels, indépendante de la période demandée.
    solde_total_actuel: Decimal
