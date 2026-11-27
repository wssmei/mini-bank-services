import { useState } from "react";
import { deposer, retirer } from "../../api/operations.js";
import { BoutonChargement } from "../../components/Bouton.jsx";
import Champ from "../../components/Champ.jsx";
import ChampSelectRecherche from "../../components/ChampSelectRecherche.jsx";
import { IconeDepot, IconeRetrait } from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { libelleTypeOperation } from "../../utils/libelles.js";
import { formaterMontant } from "../../utils/montants.js";
import { normaliserMontant, validerMontant } from "../../utils/validation.js";

const CONFIGURATION = {
  depot: {
    titre: "Effectuer un dépôt",
    sousTitre: "Créditer un compte bancaire.",
    bouton: "Confirmer le dépôt",
    envoi: "Dépôt en cours…",
    action: deposer,
    confirmation: libelleTypeOperation("DEPOT"),
    Icone: IconeDepot,
    ton: "mint",
  },
  retrait: {
    titre: "Effectuer un retrait",
    sousTitre: "Débiter un compte bancaire selon ses règles.",
    bouton: "Confirmer le retrait",
    envoi: "Retrait en cours…",
    action: retirer,
    confirmation: libelleTypeOperation("RETRAIT"),
    Icone: IconeRetrait,
    ton: "amber",
  },
};

// Un seul formulaire pour le dépôt et le retrait : même saisie (un compte, un montant), action différente.
export default function FormulaireDepotRetrait({ type, options, onSelectionnerCompte, onReussi }) {
  const configuration = CONFIGURATION[type];
  const { Icone } = configuration;

  const [saisie, setSaisie] = useState({ compteId: "", montant: "" });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [erreurServeur, setErreurServeur] = useState("");

  function modifierSaisie(champ, valeur) {
    setSaisie((precedente) => ({ ...precedente, [champ]: valeur }));
    setErreurs((precedentes) => (precedentes[champ] ? { ...precedentes, [champ]: "" } : precedentes));
    if (erreurServeur) setErreurServeur("");
    if (champ === "compteId") {
      onSelectionnerCompte?.(valeur);
    }
  }

  async function envoyer(evenement) {
    evenement.preventDefault();
    if (envoi) return;
    const montantNormalise = normaliserMontant(saisie.montant);
    const nouvellesErreurs = {
      compteId: saisie.compteId === "" ? "Choisissez un compte." : "",
      montant: validerMontant(montantNormalise),
    };
    setErreurs(nouvellesErreurs);
    if (nouvellesErreurs.compteId || nouvellesErreurs.montant) return;

    setEnvoi(true);
    setErreurServeur("");
    try {
      const transaction = await configuration.action(
        Number(saisie.compteId),
        montantNormalise,
      );
      onReussi(
        `${configuration.confirmation} de ${formaterMontant(transaction.montant)} DA effectué. ` +
          `Nouveau solde : ${formaterMontant(transaction.solde_apres)} DA.`,
      );
      setSaisie((precedente) => ({ ...precedente, montant: "" }));
      setErreurs({});
    } catch (erreur) {
      setErreurServeur(erreur.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>{configuration.titre}</h2>
          <p>{configuration.sousTitre}</p>
        </div>
        <span className={`metric-icon ${configuration.ton}`}>
          <Icone size={18} />
        </span>
      </div>

      <form onSubmit={envoyer} noValidate autoComplete="off">
        <div className="form-body">
          <ChampSelectRecherche
            id={`${type}-compte`}
            libelle="Compte bancaire"
            placeholder="Rechercher un compte par numéro ou titulaire…"
            videTexte="Aucun compte trouvé."
            options={options}
            valeur={saisie.compteId}
            onChange={(valeur) => modifierSaisie("compteId", valeur)}
            erreur={erreurs.compteId}
            disabled={envoi}
          />
          <Champ
            id={`${type}-montant`}
            name={`${type}-montant-libre`}
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
            {!envoi && <Icone size={15} />}
            {envoi ? configuration.envoi : configuration.bouton}
          </BoutonChargement>
        </div>
      </form>
    </>
  );
}
