from datetime import datetime, timezone
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.exceptions import FondsInsuffisantsError
from app.db.base import Base


class TypeOperation(StrEnum):
    DEPOT = "DEPOT"
    RETRAIT = "RETRAIT"
    VIREMENT_DEBIT = "VIREMENT_DEBIT"
    VIREMENT_CREDIT = "VIREMENT_CREDIT"


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    nom: Mapped[str] = mapped_column(String(100))
    prenom: Mapped[str] = mapped_column(String(100))

    comptes: Mapped[list["CompteBancaire"]] = relationship(back_populates="client")


class CompteBancaire(Base):
    """Classe mère. Chaque sous-classe redéfinit sa règle de retrait (polymorphisme).
    Les méthodes ne valident pas les montants : c'est le rôle des fonctions procédurales."""

    __tablename__ = "comptes"
    __mapper_args__ = {"polymorphic_on": "type_compte", "polymorphic_identity": "BASE"}

    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[str] = mapped_column(String(20), unique=True)
    solde: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    type_compte: Mapped[str] = mapped_column(String(20))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))

    client: Mapped[Client] = relationship(back_populates="comptes")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="compte")

    def __init__(self, **kwargs):
        # default= de mapped_column n'agit qu'au INSERT ; on fixe le solde à la construction.
        kwargs.setdefault("solde", Decimal("0.00"))
        super().__init__(**kwargs)

    def peut_retirer(self, montant: Decimal) -> bool:
        return montant <= self.solde

    def retirer(self, montant: Decimal) -> None:
        if not self.peut_retirer(montant):
            raise FondsInsuffisantsError("Retrait refusé par la règle du compte.")
        self.solde -= montant

    def deposer(self, montant: Decimal) -> None:
        self.solde += montant


class CompteCourant(CompteBancaire):
    __mapper_args__ = {"polymorphic_identity": "COURANT"}

    DECOUVERT_MAX = Decimal("5000.00")  # Hypothèse pédagogique

    def peut_retirer(self, montant: Decimal) -> bool:
        return self.solde - montant >= -self.DECOUVERT_MAX


class CompteEpargne(CompteBancaire):
    __mapper_args__ = {"polymorphic_identity": "EPARGNE"}

    PLAFOND_RETRAIT = Decimal("100000.00")  # Hypothèse pédagogique

    def peut_retirer(self, montant: Decimal) -> bool:
        return montant <= self.solde and montant <= self.PLAFOND_RETRAIT


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    compte_id: Mapped[int] = mapped_column(ForeignKey("comptes.id"))
    type_operation: Mapped[TypeOperation] = mapped_column(String(20))
    montant: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    solde_apres: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    date_operation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    compte: Mapped[CompteBancaire] = relationship(back_populates="transactions")