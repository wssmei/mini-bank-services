import { useEffect, useState } from "react";
import { listerClientsEtComptes } from "../../api/comptes.js";
import { BadgeTypeCompte } from "../../components/Badges.jsx";
import {
  IconeComptes,
  IconeDepot,
  IconeInfo,
  IconeOperations,
  IconeRetrait,
} from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { EtatVide, PageIntro } from "../../components/UiPrimitives.jsx";
import {
  decouvertAutorise,
  nomDuTitulaire,
  soldeDisponibleRetrait,
} from "../../utils/comptes.js";
import { libelleTypeCompte } from "../../utils/libelles.js";
import { formaterMontant } from "../../utils/montants.js";
import FormulaireDepotRetrait from "./FormulaireDepotRetrait.jsx";
import FormulaireVirement from "./FormulaireVirement.jsx";

const ONGLETS = [
  { id: "depot", libelle: "Dépôt", icone: IconeDepot },
  { id: "retrait", libelle: "Retrait", icone: IconeRetrait },
  { id: "virement", libelle: "Virement", icone: IconeOperations },
];

// Module « Opérations bancaires » : onglets (dépôt, retrait, virement) + détail solde disponible.
export default function OperationsPage({ ongletInitial = "depot", onDonneesModifiees }) {
  const [donnees, setDonnees] = useState({ clients: [], comptes: [] });
  const [chargement, setChargement] = useState(true);
  const [erreurListe, setErreurListe] = useState("");
  const [rafraichissement, setRafraichissement] = useState(0);
  const [onglet, setOnglet] = useState(ongletInitial || "depot");
  const [succes, setSucces] = useState("");
  const [compteActifId, setCompteActifId] = useState("");

  useEffect(() => {
    if (ongletInitial) {
      setOnglet(ongletInitial);
      setSucces("");
      setCompteActifId("");
    }
  }, [ongletInitial]);

  useEffect(() => {
    let actif = true;
    listerClientsEtComptes()
      .then((resultat) => {
        if (actif) {
          setDonnees(resultat);
          setErreurListe("");
        }
      })
      .catch((erreur) => {
        if (actif) setErreurListe(erreur.message);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [rafraichissement]);

  function choisirOnglet(id) {
    setSucces("");
    setCompteActifId("");
    setOnglet(id);
  }

  function apresOperation(message) {
    setSucces(message);
    setRafraichissement((n) => n + 1);
    onDonneesModifiees?.();
  }

  const { clients, comptes } = donnees;
  const options = comptes.map((compte) => {
    const titulaire = nomDuTitulaire(compte.client_id, clients);
    const typeLibelle = libelleTypeCompte(compte.type_compte);
    return {
      valeur: String(compte.id),
      libelle: `${compte.numero} · ${titulaire}`,
      sousTitre: `${typeLibelle} · Client n° ${compte.client_id}`,
      droite: `${formaterMontant(compte.solde)} DA`,
      recherche: `${compte.numero} ${titulaire} ${typeLibelle}`,
      compte,
      titulaire,
    };
  });
  const compteSelectionne = comptes.find((c) => String(c.id) === compteActifId) ?? null;

  return (
    <>
      <PageIntro
        titre="Opérations bancaires"
        description="Effectuez un dépôt, un retrait ou un virement entre comptes."
      />

      <div className="tab-list" role="tablist" aria-label="Type d'opération">
        {ONGLETS.map((o) => {
          const actif = o.id === onglet;
          const Icone = o.icone;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              id={`tab-${o.id}`}
              aria-selected={actif}
              aria-controls="operation-panel"
              onClick={() => choisirOnglet(o.id)}
            >
              <Icone size={16} />
              <span>{o.libelle}</span>
            </button>
          );
        })}
      </div>

      {erreurListe && (
        <div className="mb-5">
          <Message type="erreur" texte={erreurListe} />
        </div>
      )}

      {chargement && comptes.length === 0 ? (
        <p className="muted">Chargement…</p>
      ) : !erreurListe && comptes.length === 0 ? (
        <section className="panel">
          <EtatVide
            titre="Aucun compte disponible"
            message="Créez d'abord un compte dans le module Comptes pour effectuer une opération."
          />
        </section>
      ) : !erreurListe && onglet === "virement" && comptes.length < 2 ? (
        <section className="panel">
          <EtatVide
            titre="Deux comptes requis"
            message="Un virement demande au moins deux comptes. Créez un second compte dans le module Comptes."
          />
        </section>
      ) : (
        <div className="form-layout" role="tabpanel" id="operation-panel" aria-labelledby={`tab-${onglet}`}>
          <div>
            <section className="panel form-panel overflow-visible">
              {succes && (
                <div className="px-6 pt-6">
                  <Message type="succes" texte={succes} />
                </div>
              )}

              {onglet === "virement" ? (
                <FormulaireVirement
                  key="virement"
                  options={options}
                  onSelectionnerCompte={(id) => {
                    setSucces("");
                    setCompteActifId(id);
                  }}
                  onReussi={apresOperation}
                />
              ) : (
                <FormulaireDepotRetrait
                  key={onglet}
                  type={onglet}
                  options={options}
                  onSelectionnerCompte={(id) => {
                    setSucces("");
                    setCompteActifId(id);
                  }}
                  onReussi={apresOperation}
                />
              )}
            </section>

            <div className="preview-note">
              <IconeInfo size={16} />
              <p>
                Les montants sont transmis au serveur sous forme de texte décimal et soumis aux règles métier du compte.
              </p>
            </div>
          </div>

          <aside>
            <section className="panel">
              <div className="panel-heading">
                <h2>{onglet === "virement" ? "Compte source sélectionné" : "Compte sélectionné"}</h2>
                <span className="metric-icon blue">
                  <IconeComptes size={18} />
                </span>
              </div>
              <div className="summary-content">
                {compteSelectionne ? (
                  <>
                    <BadgeTypeCompte type={compteSelectionne.type_compte} />
                    <h3>{nomDuTitulaire(compteSelectionne.client_id, clients)}</h3>
                    <p className="mono">{compteSelectionne.numero}</p>
                    <div className="account-summary">
                      <span>Solde actuel</span>
                      <strong>{formaterMontant(compteSelectionne.solde)} DA</strong>

                      <div className="balance-breakdown">
                        <div className="balance-row">
                          <span>Découvert autorisé</span>
                          <strong>
                            {compteSelectionne.type_compte === "COURANT"
                              ? `${formaterMontant(decouvertAutorise(compteSelectionne.type_compte))} DA`
                              : "0,00 DA (aucun)"}
                          </strong>
                        </div>
                        <div className="balance-row is-highlight">
                          <span>Solde disponible</span>
                          <strong>{formaterMontant(soldeDisponibleRetrait(compteSelectionne))} DA</strong>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>Aucun compte sélectionné</h3>
                    <p>Sélectionnez un compte dans le formulaire pour afficher son solde actuel et son découvert applicable.</p>
                  </>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
