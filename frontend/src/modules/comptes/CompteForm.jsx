import { useState } from "react";
import { creerCompte } from "../../api/comptes.js";
import { Bouton, BoutonChargement } from "../../components/Bouton.jsx";
import Champ from "../../components/Champ.jsx";
import ChampSelect from "../../components/ChampSelect.jsx";
import ChampSelectRecherche from "../../components/ChampSelectRecherche.jsx";
import Message from "../../components/Message.jsx";
import { LIBELLES_TYPE_COMPTE } from "../../utils/libelles.js";
import { validerNumeroCompte } from "../../utils/validation.js";

const OPTIONS_TYPE = Object.entries(LIBELLES_TYPE_COMPTE).map(([valeur, libelle]) => ({ valeur, libelle }));

// Formulaire de création de compte. Réutilise ChampSelectRecherche pour choisir le client.
export default function CompteForm({ clients, onCree, onAnnuler }) {
  const [saisie, setSaisie] = useState({ clientId: "", typeCompte: "COURANT", numero: "" });
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
      clientId: saisie.clientId === "" ? "Choisissez un client." : "",
      numero: validerNumeroCompte(saisie.numero),
    };
    setErreurs(nouvellesErreurs);
    if (nouvellesErreurs.clientId || nouvellesErreurs.numero) return;

    setEnvoi(true);
    setErreurServeur("");
    try {
      const compte = await creerCompte({
        clientId: Number(saisie.clientId),
        typeCompte: saisie.typeCompte,
        numero: saisie.numero.trim(),
      });
      onCree(compte);
    } catch (erreur) {
      setErreurServeur(erreur.message);
    } finally {
      setEnvoi(false);
    }
  }

  const optionsClients = clients.map((client) => ({
    valeur: String(client.id),
    libelle: `${client.nom} ${client.prenom}`,
    sousTitre: `Client n° ${client.id}`,
    recherche: `${client.prenom} ${client.nom} ${client.id}`,
  }));

  return (
    <form onSubmit={envoyer} noValidate autoComplete="off">
      <ChampSelectRecherche
        id="compte-client"
        libelle="Client"
        placeholder="Rechercher un client par nom ou prénom…"
        videTexte="Aucun client trouvé."
        options={optionsClients}
        valeur={saisie.clientId}
        onChange={(valeur) => modifierSaisie("clientId", valeur)}
        erreur={erreurs.clientId}
        disabled={envoi}
      />
      <ChampSelect
        id="compte-type"
        libelle="Type de compte"
        options={OPTIONS_TYPE}
        valeur={saisie.typeCompte}
        onChange={(e) => modifierSaisie("typeCompte", e.target.value)}
      />
      <Champ
        id="compte-numero"
        libelle="Numéro de compte (facultatif)"
        maxLength={20}
        autoComplete="off"
        placeholder="Laissez vide pour un numéro automatique"
        aide="De 4 à 20 caractères (lettres, chiffres ou tirets). Le solde initial est 0,00 DA."
        valeur={saisie.numero}
        onChange={(e) => modifierSaisie("numero", e.target.value)}
        erreur={erreurs.numero}
      />
      <Message type="erreur" texte={erreurServeur} />
      <div className="dialog-actions">
        <Bouton variant="outline" onClick={onAnnuler} disabled={envoi}>
          Annuler
        </Bouton>
        <BoutonChargement type="submit" loading={envoi}>
          {envoi ? "Création…" : "Créer le compte"}
        </BoutonChargement>
      </div>
    </form>
  );
}
