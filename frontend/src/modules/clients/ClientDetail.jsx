import { useEffect, useState } from "react";
import { modifierClient, obtenirClient } from "../../api/clients.js";
import { AvatarClient, BadgeTypeCompte } from "../../components/Badges.jsx";
import { Bouton, BoutonChargement } from "../../components/Bouton.jsx";
import Champ from "../../components/Champ.jsx";
import { IconeModifier } from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { formaterMontant } from "../../utils/montants.js";
import { LONGUEUR_MAX_TEXTE, changementsDepuis, validerTexte } from "../../utils/validation.js";

// Fiche d'un client : identité, comptes rattachés, et modification. Le parent le remonte pour chaque client (key).
export default function ClientDetail({ clientId, editionInitiale = false, onModifie }) {
  const [client, setClient] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState("");

  const [enEdition, setEnEdition] = useState(false);
  const [saisie, setSaisie] = useState({ nom: "", prenom: "" });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState({ type: "", texte: "" });

  useEffect(() => {
    let actif = true;
    obtenirClient(clientId)
      .then((donnees) => {
        if (actif) {
          setClient(donnees);
          if (editionInitiale) {
            setSaisie({ nom: donnees.nom, prenom: donnees.prenom });
            setEnEdition(true);
          }
        }
      })
      .catch((erreur) => {
        if (actif) setErreurChargement(erreur.message);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [clientId, editionInitiale]);

  function commencerEdition() {
    setSaisie({ nom: client.nom, prenom: client.prenom });
    setErreurs({});
    setMessage({ type: "", texte: "" });
    setEnEdition(true);
  }

  function annulerEdition() {
    setErreurs({});
    setEnEdition(false);
  }

  function modifierSaisie(champ, valeur) {
    setSaisie((precedente) => ({ ...precedente, [champ]: valeur }));
    setErreurs((precedentes) => (precedentes[champ] ? { ...precedentes, [champ]: "" } : precedentes));
    if (message.texte) setMessage({ type: "", texte: "" });
  }

  async function enregistrer(evenement) {
    evenement.preventDefault();
    const nouvellesErreurs = {
      nom: validerTexte(saisie.nom, "Le nom"),
      prenom: validerTexte(saisie.prenom, "Le prénom"),
    };
    setErreurs(nouvellesErreurs);
    if (nouvellesErreurs.nom || nouvellesErreurs.prenom) return;

    const changements = changementsDepuis(client, saisie);
    if (Object.keys(changements).length === 0) {
      setMessage({ type: "info", texte: "Aucune modification à enregistrer." });
      return;
    }

    setEnvoi(true);
    try {
      const modifie = await modifierClient(client.id, changements);
      setClient((precedent) => ({ ...precedent, ...modifie }));
      setEnEdition(false);
      setMessage({ type: "succes", texte: "Client modifié." });
      onModifie(modifie);
    } catch (erreur) {
      setMessage({ type: "erreur", texte: erreur.message });
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) return <p className="muted">Chargement de la fiche…</p>;
  if (erreurChargement) return <Message type="erreur" texte={erreurChargement} />;

  return (
    <div className="space-y-4">
      <div className="detail-profile">
        <AvatarClient client={client} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">
            {client.nom} {client.prenom}
          </h3>
          <span className="mono muted">Client n° {client.id}</span>
        </div>
        {!enEdition && (
          <Bouton variant="outline" size="sm" onClick={commencerEdition}>
            <IconeModifier size={14} />
            Modifier
          </Bouton>
        )}
      </div>

      <Message type={message.type} texte={message.texte} />

      {enEdition ? (
        <form onSubmit={enregistrer} noValidate>
          <div className="form-row">
            <Champ
              id="edition-nom"
              libelle="Nom"
              maxLength={LONGUEUR_MAX_TEXTE}
              valeur={saisie.nom}
              onChange={(e) => modifierSaisie("nom", e.target.value)}
              erreur={erreurs.nom}
            />
            <Champ
              id="edition-prenom"
              libelle="Prénom"
              maxLength={LONGUEUR_MAX_TEXTE}
              valeur={saisie.prenom}
              onChange={(e) => modifierSaisie("prenom", e.target.value)}
              erreur={erreurs.prenom}
            />
          </div>
          <div className="dialog-actions">
            <Bouton variant="outline" onClick={annulerEdition} disabled={envoi}>
              Annuler
            </Bouton>
            <BoutonChargement type="submit" loading={envoi}>
              {envoi ? "Enregistrement…" : "Enregistrer"}
            </BoutonChargement>
          </div>
        </form>
      ) : (
        <dl className="detail-grid">
          <div>
            <dt>Nom</dt>
            <dd>{client.nom}</dd>
          </div>
          <div>
            <dt>Prénom</dt>
            <dd>{client.prenom}</dd>
          </div>
        </dl>
      )}

      <div>
        <h4 className="mb-2 text-sm font-semibold">Comptes associés</h4>
        {client.comptes.length === 0 ? (
          <p className="field-hint">Aucun compte rattaché à ce client.</p>
        ) : (
          <div className="detail-accounts">
            {client.comptes.map((compte) => (
              <div className="detail-account" key={compte.id}>
                <div>
                  <strong className="mono">{compte.numero}</strong>
                  <div>
                    <BadgeTypeCompte type={compte.type_compte} />
                  </div>
                </div>
                <strong className="amount">{formaterMontant(compte.solde)} DA</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
