import { useEffect, useState } from "react";
import { listerClientsEtComptes } from "../../api/comptes.js";
import { obtenirStatistiquesGlobales } from "../../api/consultation.js";
import AccountDistribution from "../../components/AccountDistribution.jsx";
import { BadgeOperation } from "../../components/Badges.jsx";
import CarteChiffre from "../../components/CarteChiffre.jsx";
import {
  IconeAjoutClient,
  IconeBanque,
  IconeCalendrier,
  IconeChevronDroite,
  IconeClients,
  IconeComptes,
  IconeDepot,
  IconeOperations,
  IconePlus,
} from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { PageIntro } from "../../components/UiPrimitives.jsx";
import { libelleNombreOperations } from "../../utils/libelles.js";
import { formaterMontant } from "../../utils/montants.js";

const DATE_DU_JOUR = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Algiers",
});

// Tableau de bord : affiche immédiatement le dernier instantané connu pendant la mise à jour en arrière-plan.
export default function DashboardPage({
  donneesInitiales = null,
  onDonneesChargees,
  versionDonnees = 0,
  onNaviguer,
}) {
  const [donnees, setDonnees] = useState(donneesInitiales);
  const [chargement, setChargement] = useState(donneesInitiales === null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;
    Promise.all([listerClientsEtComptes(), obtenirStatistiquesGlobales()])
      .then(([liste, stats]) => {
        if (!actif) return;
        const fraiches = { clients: liste.clients, comptes: liste.comptes, stats };
        setDonnees(fraiches);
        onDonneesChargees?.(fraiches);
        setErreur("");
      })
      .catch((e) => {
        if (actif) setErreur(e.message);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [versionDonnees, onDonneesChargees]);

  const clients = donnees?.clients ?? [];
  const comptes = donnees?.comptes ?? [];
  const stats = donnees?.stats ?? null;

  const nbCourants = comptes.filter((c) => c.type_compte === "COURANT").length;
  const nbEpargne = comptes.filter((c) => c.type_compte === "EPARGNE").length;
  const totalOperations = stats
    ? stats.depots.nombre + stats.retraits.nombre + stats.virements.nombre
    : 0;

  return (
    <>
      <PageIntro
        titre="Tableau de bord"
        description="Vue d’ensemble des clients, comptes et opérations enregistrés."
        action={
          <div className="date-chip">
            <IconeCalendrier size={14} />
            <span>{DATE_DU_JOUR.format(new Date())}</span>
          </div>
        }
      />

      {erreur && (
        <div className="mb-5">
          <Message type="erreur" texte={erreur} />
        </div>
      )}

      {chargement && !donnees && <p className="muted mb-4">Chargement des données…</p>}

      {donnees && (
        <>
          <div className="metric-grid">
            <CarteChiffre
              libelle="Total des clients"
              valeur={String(clients.length)}
              icone={<IconeClients size={18} />}
              ton="blue"
              precision={
                <>
                  <strong>{clients.length}</strong>{" "}
                  {clients.length <= 1 ? "client enregistré" : "clients enregistrés"}
                </>
              }
            />
            <CarteChiffre
              libelle="Comptes bancaires"
              valeur={String(comptes.length)}
              icone={<IconeComptes size={18} />}
              ton="teal"
              precision={
                <>
                  <strong>{nbCourants} courant(s)</strong> · {nbEpargne} épargne
                </>
              }
            />
            <CarteChiffre
              libelle="Solde global"
              valeur={`${formaterMontant(stats.solde_total_actuel)} DA`}
              icone={<IconeBanque size={18} />}
              ton="amber"
              estMonnaie
              precision="Somme des soldes actuels"
            />
            <CarteChiffre
              libelle="Opérations enregistrées"
              valeur={String(totalOperations)}
              icone={<IconeOperations size={18} />}
              ton="violet"
              precision={`${stats.depots.nombre} dépôt(s) · ${stats.retraits.nombre} retrait(s) · ${stats.virements.nombre} virement(s)`}
            />
          </div>

          <div className="dashboard-charts">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Synthèse des opérations globales</h2>
                  <p>Totaux cumulés retournés par le serveur</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNaviguer("consultation")}
                  className="btn btn-ghost btn-sm"
                >
                  Consulter
                  <IconeChevronDroite size={14} />
                </button>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type d’opération</th>
                      <th>Nombre</th>
                      <th className="align-right">Montant total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td data-label="Type d’opération">
                        <BadgeOperation type="DEPOT" />
                      </td>
                      <td data-label="Nombre">{libelleNombreOperations(stats.depots.nombre)}</td>
                      <td data-label="Montant total" className="align-right amount positive">
                        {formaterMontant(stats.depots.montant)} DA
                      </td>
                    </tr>
                    <tr>
                      <td data-label="Type d’opération">
                        <BadgeOperation type="RETRAIT" />
                      </td>
                      <td data-label="Nombre">{libelleNombreOperations(stats.retraits.nombre)}</td>
                      <td data-label="Montant total" className="align-right amount">
                        {formaterMontant(stats.retraits.montant)} DA
                      </td>
                    </tr>
                    <tr>
                      <td data-label="Type d’opération">
                        <BadgeOperation type="VIREMENT_DEBIT" />
                      </td>
                      <td data-label="Nombre">
                        {libelleNombreOperations(stats.virements.nombre)}
                      </td>
                      <td data-label="Montant total" className="align-right amount">
                        {formaterMontant(stats.virements.montant)} DA
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="table-bottom">
                <span>Un virement est compté une fois (ligne débit)</span>
                <span>
                  Solde global : <strong>{formaterMontant(stats.solde_total_actuel)} DA</strong>
                </span>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Répartition des comptes</h2>
                  <p>Courants et épargne</p>
                </div>
              </div>
              <AccountDistribution comptes={comptes} />
            </section>
          </div>

          <div className="mt-6">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Accès rapides</h2>
                  <p>Raccourcis vers les actions les plus fréquentes</p>
                </div>
              </div>
              <div className="quick-actions grid md:grid-cols-2 md:gap-x-8">
                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNaviguer("clients", { ouvrirCreation: true })}
                >
                  <span>
                    <IconeAjoutClient size={18} />
                  </span>
                  <div>
                    <strong>Créer un client</strong>
                    <p>Enregistrer un nouveau client</p>
                  </div>
                  <IconeChevronDroite size={16} />
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNaviguer("comptes", { ouvrirCreation: true })}
                >
                  <span>
                    <IconePlus size={18} />
                  </span>
                  <div>
                    <strong>Créer un compte</strong>
                    <p>Ouvrir un compte courant ou épargne</p>
                  </div>
                  <IconeChevronDroite size={16} />
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNaviguer("operations", { onglet: "depot" })}
                >
                  <span>
                    <IconeDepot size={18} />
                  </span>
                  <div>
                    <strong>Effectuer un dépôt</strong>
                    <p>Créditer un compte bancaire</p>
                  </div>
                  <IconeChevronDroite size={16} />
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => onNaviguer("operations", { onglet: "virement" })}
                >
                  <span>
                    <IconeOperations size={18} />
                  </span>
                  <div>
                    <strong>Effectuer un virement</strong>
                    <p>Transférer un montant entre deux comptes</p>
                  </div>
                  <IconeChevronDroite size={16} />
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
