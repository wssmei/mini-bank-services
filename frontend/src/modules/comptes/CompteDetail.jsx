import { useEffect, useState } from "react";
import { obtenirCompte, obtenirSolde } from "../../api/comptes.js";
import { BadgeTypeCompte } from "../../components/Badges.jsx";
import { Bouton, BoutonChargement } from "../../components/Bouton.jsx";
import { IconeActualiser, IconeChevronDroite, IconeComptes } from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { decouvertAutorise, soldeDisponibleRetrait } from "../../utils/comptes.js";
import { formaterMontant } from "../../utils/montants.js";

// Détail d'un compte : numéro, type, titulaire, solde actuel, découvert et solde disponible au retrait.
export default function CompteDetail({ compteId, clients, onSoldeActualise, onVoirHistorique }) {
  const [compte, setCompte] = useState(null);
  const [solde, setSolde] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState("");
  const [actualisation, setActualisation] = useState(false);
  const [actualise, setActualise] = useState(false);
  const [erreurSolde, setErreurSolde] = useState("");

  useEffect(() => {
    let actif = true;
    Promise.all([obtenirCompte(compteId), obtenirSolde(compteId)])
      .then(([donneesCompte, donneesSolde]) => {
        if (actif) {
          setCompte(donneesCompte);
          setSolde(donneesSolde.solde);
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
  }, [compteId]);

  async function actualiser() {
    setActualisation(true);
    setErreurSolde("");
    setActualise(false);
    try {
      const donnees = await obtenirSolde(compteId);
      setSolde(donnees.solde);
      setActualise(true);
      onSoldeActualise?.();
    } catch (erreur) {
      setErreurSolde(erreur.message);
    } finally {
      setActualisation(false);
    }
  }

  if (chargement) return <p className="muted">Chargement du compte…</p>;
  if (erreurChargement) return <Message type="erreur" texte={erreurChargement} />;

  const titulaire = clients.find((c) => c.id === compte.client_id);
  const decouvert = decouvertAutorise(compte.type_compte);
  const disponible = soldeDisponibleRetrait({ ...compte, solde });

  return (
    <div className="space-y-4">
      <div className="detail-profile">
        <span className="metric-icon blue">
          <IconeComptes size={20} />
        </span>
        <div>
          <h3 className="mono text-base font-semibold">{compte.numero}</h3>
          <span className="cell-sub">
            {titulaire ? `${titulaire.nom} ${titulaire.prenom}` : "Client inconnu"} · n° {compte.client_id}
          </span>
        </div>
      </div>

      <BadgeTypeCompte type={compte.type_compte} />

      <div className="account-summary">
        <span>Solde actuel</span>
        <strong>{formaterMontant(solde)} DA</strong>

        <div className="balance-breakdown">
          <div className="balance-row">
            <span>Découvert autorisé</span>
            <strong>
              {compte.type_compte === "COURANT"
                ? `${formaterMontant(decouvert)} DA`
                : "0,00 DA (aucun découvert)"}
            </strong>
          </div>
          <div className="balance-row is-highlight">
            <span>Solde disponible au retrait</span>
            <strong>{formaterMontant(disponible)} DA</strong>
          </div>
        </div>
      </div>

      {actualise && <Message type="succes" texte="Le solde affiché est à jour." />}
      <Message type="erreur" texte={erreurSolde} />

      <div className="dialog-actions">
        <BoutonChargement variant="outline" loading={actualisation} onClick={actualiser}>
          {!actualisation && <IconeActualiser size={15} />}
          {actualisation ? "Actualisation…" : "Actualiser le solde"}
        </BoutonChargement>
        {onVoirHistorique && (
          <Bouton onClick={() => onVoirHistorique(compte.id)}>
            Historique
            <IconeChevronDroite size={15} />
          </Bouton>
        )}
      </div>
    </div>
  );
}
