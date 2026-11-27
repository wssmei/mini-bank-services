import { useState } from "react";
import { creerClient } from "../../api/clients.js";
import { Bouton, BoutonChargement } from "../../components/Bouton.jsx";
import Champ from "../../components/Champ.jsx";
import Message from "../../components/Message.jsx";
import { LONGUEUR_MAX_TEXTE, validerTexte } from "../../utils/validation.js";

// Formulaire de création. Il ne connaît pas la liste : il transmet le client créé à la page (onCree).
export default function ClientForm({ onCree, onAnnuler }) {
  const [saisie, setSaisie] = useState({ nom: "", prenom: "" });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [erreurServeur, setErreurServeur] = useState("");

  function modifierSaisie(champ, valeur) {
    setSaisie((precedente) => ({ ...precedente, [champ]: valeur }));
    setErreurs((precedentes) => (precedentes[champ] ? { ...precedentes, [champ]: "" } : precedentes));
    if (erreurServeur) setErreurServeur("");
  }

  async function envoyer(evenement) {
    evenement.preventDefault();
    const nouvellesErreurs = {
      nom: validerTexte(saisie.nom, "Le nom"),
      prenom: validerTexte(saisie.prenom, "Le prénom"),
    };
    setErreurs(nouvellesErreurs);
    if (nouvellesErreurs.nom || nouvellesErreurs.prenom) return;

    setEnvoi(true);
    setErreurServeur("");
    try {
      const client = await creerClient({ nom: saisie.nom.trim(), prenom: saisie.prenom.trim() });
      onCree(client);
    } catch (erreur) {
      setErreurServeur(erreur.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={envoyer} noValidate>
      <div className="form-row">
        <Champ
          id="client-nom"
          libelle="Nom"
          maxLength={LONGUEUR_MAX_TEXTE}
          placeholder="Ex. Benali"
          valeur={saisie.nom}
          onChange={(e) => modifierSaisie("nom", e.target.value)}
          erreur={erreurs.nom}
        />
        <Champ
          id="client-prenom"
          libelle="Prénom"
          maxLength={LONGUEUR_MAX_TEXTE}
          placeholder="Ex. Amine"
          valeur={saisie.prenom}
          onChange={(e) => modifierSaisie("prenom", e.target.value)}
          erreur={erreurs.prenom}
        />
      </div>
      <Message type="erreur" texte={erreurServeur} />
      <div className="dialog-actions">
        <Bouton variant="outline" onClick={onAnnuler} disabled={envoi}>
          Annuler
        </Bouton>
        <BoutonChargement type="submit" loading={envoi}>
          {envoi ? "Création…" : "Créer le client"}
        </BoutonChargement>
      </div>
    </form>
  );
}
