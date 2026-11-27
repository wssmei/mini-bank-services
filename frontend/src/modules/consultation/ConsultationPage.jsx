import { useEffect, useState } from "react";
import { listerClientsEtComptes } from "../../api/comptes.js";
import { IconeComptes, IconeHistorique, IconeStatistiques } from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { EtatVide, PageIntro } from "../../components/UiPrimitives.jsx";
import { nomDuTitulaire } from "../../utils/comptes.js";
import { libelleTypeCompte } from "../../utils/libelles.js";
import { formaterMontant } from "../../utils/montants.js";
import HistoriqueCompte from "./HistoriqueCompte.jsx";
import StatistiquesCompte from "./StatistiquesCompte.jsx";
import StatistiquesGlobales from "./StatistiquesGlobales.jsx";

const ONGLETS = [
  { id: "historique", libelle: "Historique d'un compte", icone: IconeHistorique },
  { id: "globales", libelle: "Statistiques globales", icone: IconeStatistiques },
  { id: "compte", libelle: "Statistiques d'un compte", icone: IconeComptes },
];

// Module « Consultation et statistiques » : trois vues, historique et deux types de statistiques.
export default function ConsultationPage({ compteInitialId = "" }) {
  const [donnees, setDonnees] = useState({ clients: [], comptes: [] });
  const [chargement, setChargement] = useState(true);
  const [erreurListe, setErreurListe] = useState("");
  const [onglet, setOnglet] = useState("historique");

  useEffect(() => {
    if (compteInitialId) {
      setOnglet("historique");
    }
  }, [compteInitialId]);

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
  }, []);

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
    };
  });
  const besoinDeComptes = onglet !== "globales";

  return (
    <>
      <PageIntro
        titre="Consultation et statistiques"
        description="Retrouvez les mouvements bancaires d’un compte et les statistiques globales ou par compte."
      />

      <div className="tab-list" role="tablist" aria-label="Vue de consultation">
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
              aria-controls="consultation-panel"
              onClick={() => setOnglet(o.id)}
            >
              <Icone size={16} />
              <span>{o.libelle}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="consultation-panel" aria-labelledby={`tab-${onglet}`}>
        {erreurListe && besoinDeComptes && (
          <div className="mb-5">
            <Message type="erreur" texte={erreurListe} />
          </div>
        )}

        {chargement && besoinDeComptes && <p className="muted">Chargement…</p>}

        {!chargement && !erreurListe && besoinDeComptes && comptes.length === 0 && (
          <section className="panel">
            <EtatVide
              titre="Aucun compte disponible"
              message="Créez d'abord un compte dans le module Comptes pour consulter son historique ou ses statistiques."
            />
          </section>
        )}

        {onglet === "historique" && !chargement && comptes.length > 0 && (
          <HistoriqueCompte
            key={compteInitialId || "historique"}
            options={options}
            comptes={comptes}
            compteInitialId={compteInitialId}
          />
        )}

        {onglet === "globales" && <StatistiquesGlobales comptes={comptes} />}

        {onglet === "compte" && !chargement && comptes.length > 0 && (
          <StatistiquesCompte
            key={compteInitialId || "stats-compte"}
            options={options}
            comptes={comptes}
            clients={clients}
            compteInitialId={compteInitialId}
          />
        )}
      </div>
    </>
  );
}
