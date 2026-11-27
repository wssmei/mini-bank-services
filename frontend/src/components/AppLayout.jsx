import { useEffect, useRef, useState } from "react";
import { Bouton } from "./Bouton.jsx";
import EtatBackend from "./EtatBackend.jsx";
import {
  IconeBanque,
  IconeChevronDroite,
  IconeClients,
  IconeComptes,
  IconeFermer,
  IconeMenu,
  IconeOperations,
  IconePanneauFermer,
  IconePanneauOuvrir,
  IconeStatistiques,
  IconeTableauBord,
} from "./Icons.jsx";

export const MODULES = [
  { id: "dashboard", libelle: "Tableau de bord", icone: IconeTableauBord },
  { id: "clients", libelle: "Clients", icone: IconeClients },
  { id: "comptes", libelle: "Comptes", icone: IconeComptes },
  { id: "operations", libelle: "Opérations", icone: IconeOperations },
  { id: "consultation", libelle: "Consultation et statistiques", icone: IconeStatistiques },
];

export function Marque() {
  return (
    <div className="brand">
      <span className="bank-logo" aria-hidden="true">
        <IconeBanque size={22} />
      </span>
      <div>
        <strong>BankServices</strong>
        <span>Gestion bancaire</span>
      </div>
    </div>
  );
}

export default function AppLayout({
  moduleActif,
  onChangerModule,
  actualisation,
  onClientsCount,
  children,
}) {
  const [reduit, setReduit] = useState(false);
  const [mobileOuvert, setMobileOuvert] = useState(false);
  const drawerRef = useRef(null);

  const actif = MODULES.find((m) => m.id === moduleActif) ?? MODULES[0];

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (mobileOuvert && !dialog.open) {
      dialog.showModal();
    } else if (!mobileOuvert && dialog.open) {
      dialog.close();
    }
  }, [mobileOuvert]);

  function selectionnerModule(id) {
    onChangerModule(id);
    setMobileOuvert(false);
  }

  function renduNavigation({ estMobile = false } = {}) {
    return (
      <>
        {estMobile ? (
          <div className="mobile-drawer-header">
            <Marque />
            <Bouton
              variant="ghost"
              size="icon"
              onClick={() => setMobileOuvert(false)}
              aria-label="Fermer le menu"
            >
              <IconeFermer size={18} />
            </Bouton>
          </div>
        ) : (
          <Marque />
        )}

        <div className="nav-section-label">ESPACE DE GESTION</div>

        <nav aria-label="Modules">
          {MODULES.map((m) => {
            const estActif = m.id === moduleActif;
            const Icone = m.icone;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectionnerModule(m.id)}
                aria-current={estActif ? "page" : undefined}
                className={`nav-item ${estActif ? "active" : ""}`}
                title={reduit && !estMobile ? m.libelle : undefined}
              >
                <Icone size={18} />
                <span className="nav-item-label">{m.libelle}</span>
                {estActif && <span className="nav-active-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <span className="user-avatar">BS</span>
            <div>
              <strong>Poste opérateur</strong>
              <span>Espace de gestion</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`app-shell ${reduit ? "is-collapsed" : ""}`}>
      <aside className="desktop-sidebar" aria-label="Navigation latérale">
        {renduNavigation()}
      </aside>

      <dialog
        ref={drawerRef}
        className="mobile-drawer-dialog"
        aria-label="Navigation BankServices"
        onCancel={(e) => {
          e.preventDefault();
          setMobileOuvert(false);
        }}
        onClick={(e) => {
          if (e.target === drawerRef.current) setMobileOuvert(false);
        }}
      >
        {mobileOuvert && renduNavigation({ estMobile: true })}
      </dialog>

      <div className="main-shell">
        <header className="top-header">
          <div className="header-left">
            <Bouton
              variant="ghost"
              size="icon"
              className="desktop-toggle"
              onClick={() => setReduit((r) => !r)}
              aria-label={reduit ? "Développer le menu" : "Réduire le menu"}
              title={reduit ? "Développer le menu" : "Réduire le menu"}
            >
              {reduit ? <IconePanneauOuvrir size={18} /> : <IconePanneauFermer size={18} />}
            </Bouton>

            <Bouton
              variant="ghost"
              size="icon"
              className="mobile-toggle"
              onClick={() => setMobileOuvert(true)}
              aria-label="Ouvrir le menu"
            >
              <IconeMenu size={19} />
            </Bouton>

            <div className="breadcrumb">
              <span>Gestion bancaire</span>
              <IconeChevronDroite size={14} />
              <strong>{actif.libelle}</strong>
            </div>
          </div>

          <div className="header-right">
            <div className="header-user">
              <span className="user-avatar small">BS</span>
              <span>BankServices</span>
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="main-body">
            <EtatBackend actualisation={actualisation} onClientsCount={onClientsCount} />
            {children}
          </div>
          <footer className="page-footer">
            <span>© 2026 BankServices</span>
            <span>Espace de gestion bancaire</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
