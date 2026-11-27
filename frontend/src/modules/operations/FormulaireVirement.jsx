import { useState } from "react";
import { virer } from "../../api/operations.js";
import { BadgeTypeCompte } from "../../components/Badges.jsx";
import { Bouton, BoutonChargement } from "../../components/Bouton.jsx";
import Champ from "../../components/Champ.jsx";
import ChampSelectRecherche from "../../components/ChampSelectRecherche.jsx";
import { IconeOperations } from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { Modal } from "../../components/UiPrimitives.jsx";
import { formaterMontant } from "../../utils/montants.js";
import { normaliserMontant, validerMontant } from "../../utils/validation.js";

// Formulaire de virement avec modale de confirmation explicite avant exécution.
export default function FormulaireVirement({ options, onSelectionnerCompte, onReussi }) {
  const [saisie, setSaisie] = useState({ sourceId: "", destinationId: "", montant: "" });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [erreurServeur, setErreurServeur] = useState("");
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  function modifierSaisie(champ, valeur) {
    setSaisie((precedente) => ({ ...precedente, [champ]: valeur }));
    setErreurs((precedentes) => {
      if (!precedentes[champ] && !(champ === "sourceId" && precedentes.destinationId)) {
        return precedentes;
      }
      return { ...precedentes, [champ]: "", ...(champ === "sourceId" ? { destinationId: "" } : {}) };
    });
    if (erreurServeur) setErreurServeur("");
    if (champ === "sourceId") {
      onSelectionnerCompte?.(valeur);
    }
  }

  function preparerConfirmation(evenement) {
    evenement.preventDefault();
    if (envoi) return;
    const montantNormalise = normaliserMontant(saisie.montant);
    const nouvellesErreurs = {
      sourceId: saisie.sourceId === "" ? "Choisissez le compte source." : "",
      destinationId: saisie.destinationId === "" ? "Choisissez le compte destination." : "",
      montant: validerMontant(montantNormalise),
    };
    if (!nouvellesErreurs.destinationId && saisie.destinationId === saisie.sourceId) {
      nouvellesErreurs.destinationId = "Le compte destination doit être différent du compte source.";
    }
    setErreurs(nouvellesErreurs);
    if (Object.values(nouvellesErreurs).some(Boolean)) return;

    setErreurServeur("");
    setConfirmationOuverte(true);
  }

  async function confirmerVirement() {
    if (envoi) return;
    const montantNormalise = normaliserMontant(saisie.montant);
    setEnvoi(true);
    setErreurServeur("");
    try {
      const virement = await virer({
        sourceId: Number(saisie.sourceId),
        destinationId: Number(saisie.destinationId),
        montant: montantNormalise,
      });
      setConfirmationOuverte(false);
      onReussi(
        `Virement de ${formaterMontant(virement.debit.montant)} DA effectué. ` +
          `Nouveau solde du compte source : ${formaterMontant(virement.debit.solde_apres)} DA.`,
      );
      setSaisie((precedente) => ({ ...precedente, montant: "" }));
      setErreurs({});
    } catch (erreur) {
      setConfirmationOuverte(false);
      setErreurServeur(erreur.message);
    } finally {
      setEnvoi(false);
    }
  }

  const optionSource = options.find((opt) => opt.valeur === saisie.sourceId) ?? null;
  const optionDestination = options.find((opt) => opt.valeur === saisie.destinationId) ?? null;
  const montantNormalise = normaliserMontant(saisie.montant);

  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>Effectuer un virement</h2>
          <p>Transférer un montant de manière atomique entre deux comptes.</p>
        </div>
        <span className="metric-icon blue">
          <IconeOperations size={18} />
        </span>
      </div>

      <form onSubmit={preparerConfirmation} noValidate autoComplete="off">
        <div className="form-body">
          <ChampSelectRecherche
            id="virement-source"
            libelle="Compte source (débité)"
            placeholder="Rechercher le compte source…"
            videTexte="Aucun compte trouvé."
            options={options}
            valeur={saisie.sourceId}
            onChange={(valeur) => modifierSaisie("sourceId", valeur)}
            erreur={erreurs.sourceId}
            disabled={envoi}
          />
          <ChampSelectRecherche
            id="virement-destination"
            libelle="Compte destination (crédité)"
            placeholder="Rechercher le compte destination…"
            videTexte="Aucun compte trouvé."
            options={options}
            valeur={saisie.destinationId}
            onChange={(valeur) => modifierSaisie("destinationId", valeur)}
            erreur={erreurs.destinationId}
            disabled={envoi}
          />
          <Champ
            id="virement-montant"
            name="virement-montant-libre"
            libelle="Montant (DA)"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex. 1200.50"
            aide="Montant strictement positif, deux décimales maximum."
            valeur={saisie.montant}
            onChange={(e) => modifierSaisie("montant", e.target.value)}
            erreur={erreurs.montant}
            disabled={envoi}
          />
          <Message type="erreur" texte={erreurServeur} />
        </div>
        <div className="form-footer">
          <BoutonChargement type="submit" loading={envoi}>
            {!envoi && <IconeOperations size={15} />}
            {envoi ? "Virement en cours…" : "Vérifier le virement"}
          </BoutonChargement>
        </div>
      </form>

      <Modal
        ouvert={confirmationOuverte}
        onFermer={() => {
          if (!envoi) setConfirmationOuverte(false);
        }}
        titre="Confirmer le virement"
        description="Vérifiez les informations ci-dessous avant d’exécuter le transfert."
      >
        {optionSource && optionDestination && (
          <div className="space-y-4">
            <div className="confirm-summary">
              <div className="confirm-summary-row">
                <span>Compte source</span>
                <div>
                  <strong className="mono">{optionSource.compte.numero}</strong>
                  <div className="cell-sub">{optionSource.titulaire}</div>
                  <div className="mt-1">
                    <BadgeTypeCompte type={optionSource.compte.type_compte} />
                  </div>
                </div>
              </div>

              <div className="confirm-summary-row">
                <span>Compte destination</span>
                <div>
                  <strong className="mono">{optionDestination.compte.numero}</strong>
                  <div className="cell-sub">{optionDestination.titulaire}</div>
                  <div className="mt-1">
                    <BadgeTypeCompte type={optionDestination.compte.type_compte} />
                  </div>
                </div>
              </div>

              <div className="confirm-summary-amount">
                <span>Montant du virement</span>
                <strong>{formaterMontant(montantNormalise)} DA</strong>
              </div>
            </div>

            <div className="dialog-actions">
              <Bouton
                variant="outline"
                onClick={() => setConfirmationOuverte(false)}
                disabled={envoi}
              >
                Annuler
              </Bouton>
              <BoutonChargement loading={envoi} onClick={confirmerVirement}>
                {!envoi && <IconeOperations size={15} />}
                {envoi ? "Virement en cours…" : "Confirmer le virement"}
              </BoutonChargement>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
