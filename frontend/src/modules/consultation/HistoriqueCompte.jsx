import { useEffect, useState } from "react";
import { obtenirHistorique } from "../../api/consultation.js";
import { BadgeOperation } from "../../components/Badges.jsx";
import { Bouton } from "../../components/Bouton.jsx";
import Champ from "../../components/Champ.jsx";
import ChampSelect from "../../components/ChampSelect.jsx";
import ChampSelectRecherche from "../../components/ChampSelectRecherche.jsx";
import Message from "../../components/Message.jsx";
import { EtatVide } from "../../components/UiPrimitives.jsx";
import { LIBELLES_TYPE_OPERATION } from "../../utils/libelles.js";
import { formaterMontant } from "../../utils/montants.js";
import { formaterDateHeure, normaliserDateIso, validerPeriode } from "../../utils/periodes.js";

const OPTIONS_TYPE = Object.entries(LIBELLES_TYPE_OPERATION).map(([valeur, libelle]) => ({ valeur, libelle }));

// Historique d'un compte. Chaque changement de filtre relance la lecture au format ISO YYYY-MM-DD.
export default function HistoriqueCompte({ options, comptes = [], compteInitialId = "" }) {
  const [filtres, setFiltres] = useState({
    compteId: compteInitialId,
    typeOperation: "",
    dateDebut: "",
    dateFin: "",
  });
  const [resultat, setResultat] = useState({ cle: "", operations: [], erreur: "" });

  const cle = JSON.stringify(filtres);
  const erreurPeriode = validerPeriode(filtres.dateDebut, filtres.dateFin);
  const enAttente = filtres.compteId !== "" && erreurPeriode === "" && resultat.cle !== cle;
  const operations = resultat.cle === cle ? resultat.operations : [];
  const erreur = resultat.cle === cle ? resultat.erreur : "";
  const compteSelectionne = comptes.find((c) => String(c.id) === filtres.compteId) ?? null;

  function modifierFiltre(champ, valeur) {
    const valeurPropre =
      champ === "dateDebut" || champ === "dateFin" ? normaliserDateIso(valeur) : valeur;
    setFiltres((precedents) => ({ ...precedents, [champ]: valeurPropre }));
  }

  function reinitialiserFiltres() {
    setFiltres((precedents) => ({
      ...precedents,
      typeOperation: "",
      dateDebut: "",
      dateFin: "",
    }));
  }

  useEffect(() => {
    const { compteId, typeOperation, dateDebut, dateFin } = filtres;
    if (compteId === "" || validerPeriode(dateDebut, dateFin) !== "") return;

    let actif = true;
    const cleCourante = JSON.stringify(filtres);
    obtenirHistorique(compteId, {
      typeOperation,
      dateDebut: normaliserDateIso(dateDebut),
      dateFin: normaliserDateIso(dateFin),
    })
      .then((liste) => {
        if (actif) setResultat({ cle: cleCourante, operations: liste, erreur: "" });
      })
      .catch((e) => {
        if (actif) setResultat({ cle: cleCourante, operations: [], erreur: e.message });
      });
    return () => {
      actif = false;
    };
  }, [filtres]);

  const aDesFiltres = Boolean(filtres.typeOperation || filtres.dateDebut || filtres.dateFin);

  return (
    <section className="panel overflow-visible">
      <div className="panel-heading">
        <div>
          <h2>Historique des opérations</h2>
          <p>Consultez les mouvements d’un compte bancaire (heure d’Algérie).</p>
        </div>
        {aDesFiltres && (
          <Bouton variant="outline" size="sm" onClick={reinitialiserFiltres}>
            Réinitialiser les filtres
          </Bouton>
        )}
      </div>

      <div className="filters">
        <ChampSelectRecherche
          id="historique-compte"
          libelle="Compte"
          placeholder="Rechercher par numéro ou titulaire…"
          videTexte="Aucun compte trouvé."
          options={options}
          valeur={filtres.compteId}
          onChange={(valeur) => modifierFiltre("compteId", valeur)}
        />
        <ChampSelect
          id="historique-type"
          libelle="Type d'opération"
          placeholder="Tous les types"
          options={OPTIONS_TYPE}
          valeur={filtres.typeOperation}
          onChange={(e) => modifierFiltre("typeOperation", e.target.value)}
        />
        <Champ
          id="historique-debut"
          libelle="Date de début"
          type="date"
          valeur={filtres.dateDebut}
          onChange={(e) => modifierFiltre("dateDebut", e.target.value)}
        />
        <Champ
          id="historique-fin"
          libelle="Date de fin"
          type="date"
          valeur={filtres.dateFin}
          onChange={(e) => modifierFiltre("dateFin", e.target.value)}
          erreur={erreurPeriode}
        />
      </div>

      {erreur && (
        <div className="px-6 pb-4">
          <Message type="erreur" texte={erreur} />
        </div>
      )}

      {filtres.compteId === "" ? (
        <EtatVide
          titre="Sélectionnez un compte"
          message="Recherchez et choisissez un compte pour afficher son historique."
        />
      ) : enAttente ? (
        <div className="p-6 muted">Chargement…</div>
      ) : erreurPeriode === "" && !erreur && operations.length === 0 ? (
        <EtatVide
          titre="Aucune opération"
          message="Aucune opération ne correspond à ces critères."
        />
      ) : !enAttente && operations.length > 0 ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Opération</th>
                <th>Référence</th>
                <th>Date (heure d'Algérie)</th>
                <th className="align-right">Montant</th>
                <th className="align-right">Solde après</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => {
                const estEntree =
                  operation.type_operation === "DEPOT" ||
                  operation.type_operation === "VIREMENT_CREDIT";
                return (
                  <tr key={operation.id}>
                    <td data-label="Opération">
                      <BadgeOperation type={operation.type_operation} />
                    </td>
                    <td data-label="Référence" className="mono muted">
                      #{operation.id}
                    </td>
                    <td data-label="Date" className="whitespace-nowrap">
                      {formaterDateHeure(operation.date_operation)}
                    </td>
                    <td
                      data-label="Montant"
                      className={`align-right amount ${estEntree ? "positive" : ""}`}
                    >
                      {estEntree ? "+" : "−"} {formaterMontant(operation.montant)} DA
                    </td>
                    <td data-label="Solde après" className="align-right amount">
                      {formaterMontant(operation.solde_apres)} DA
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="table-bottom">
        <span>
          <strong>{operations.length}</strong> opération(s) affichée(s)
        </span>
        {compteSelectionne && (
          <span>
            Solde actuel : <strong>{formaterMontant(compteSelectionne.solde)} DA</strong>
          </span>
        )}
      </div>
    </section>
  );
}
