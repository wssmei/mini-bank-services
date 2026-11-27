import { useEffect, useState } from "react";
import { obtenirStatistiquesGlobales } from "../../api/consultation.js";
import AccountDistribution from "../../components/AccountDistribution.jsx";
import { Bouton } from "../../components/Bouton.jsx";
import CarteChiffre from "../../components/CarteChiffre.jsx";
import Champ from "../../components/Champ.jsx";
import {
  IconeBanque,
  IconeComptes,
  IconeDepot,
  IconeOperations,
  IconeRetrait,
} from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { libelleNombreOperations } from "../../utils/libelles.js";
import { formaterMontant } from "../../utils/montants.js";
import { normaliserDateIso, validerPeriode } from "../../utils/periodes.js";

// Totaux de toute la banque sur une période facultative (les deux dates peuvent rester vides).
// Le solde total actuel n'est jamais filtré par période : la page le dit explicitement.
export default function StatistiquesGlobales({ comptes = [] }) {
  const [periode, setPeriode] = useState({ dateDebut: "", dateFin: "" });
  const [resultat, setResultat] = useState({ cle: "", statistiques: null, erreur: "" });

  const cle = JSON.stringify(periode);
  const erreurPeriode = validerPeriode(periode.dateDebut, periode.dateFin);
  const enAttente = erreurPeriode === "" && resultat.cle !== cle;
  const statistiques = resultat.cle === cle ? resultat.statistiques : null;
  const erreur = resultat.cle === cle ? resultat.erreur : "";

  function modifierPeriode(champ, valeur) {
    setPeriode((precedente) => ({ ...precedente, [champ]: normaliserDateIso(valeur) }));
  }

  useEffect(() => {
    if (validerPeriode(periode.dateDebut, periode.dateFin) !== "") return;

    let actif = true;
    const cleCourante = JSON.stringify(periode);
    obtenirStatistiquesGlobales({
      dateDebut: normaliserDateIso(periode.dateDebut),
      dateFin: normaliserDateIso(periode.dateFin),
    })
      .then((donnees) => {
        if (actif) setResultat({ cle: cleCourante, statistiques: donnees, erreur: "" });
      })
      .catch((e) => {
        if (actif) setResultat({ cle: cleCourante, statistiques: null, erreur: e.message });
      });
    return () => {
      actif = false;
    };
  }, [periode]);

  const aUnePeriode = Boolean(periode.dateDebut || periode.dateFin);

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Filtre par période</h2>
            <p>
              Les dates limitent les dépôts, retraits et virements. Le solde total actuel ne dépend pas de la période.
            </p>
          </div>
          {aUnePeriode && (
            <Bouton
              variant="outline"
              size="sm"
              onClick={() => setPeriode({ dateDebut: "", dateFin: "" })}
            >
              Réinitialiser
            </Bouton>
          )}
        </div>
        <div className="filters cols-2">
          <Champ
            id="globales-debut"
            libelle="Date de début"
            type="date"
            valeur={periode.dateDebut}
            onChange={(e) => modifierPeriode("dateDebut", e.target.value)}
          />
          <Champ
            id="globales-fin"
            libelle="Date de fin"
            type="date"
            valeur={periode.dateFin}
            onChange={(e) => modifierPeriode("dateFin", e.target.value)}
            erreur={erreurPeriode}
          />
        </div>
      </section>

      <Message type="erreur" texte={erreur} />
      {enAttente && <p className="muted">Chargement…</p>}

      {statistiques && !enAttente && (
        <>
          <div className="metric-grid cols-3 stats-block">
            <CarteChiffre
              libelle="Comptes"
              valeur={String(statistiques.nombre_comptes)}
              icone={<IconeComptes size={18} />}
              ton="teal"
              precision="Nombre de comptes"
            />
            <CarteChiffre
              libelle="Dépôts"
              valeur={`${formaterMontant(statistiques.depots.montant)} DA`}
              icone={<IconeDepot size={18} />}
              ton="mint"
              estMonnaie
              precision={libelleNombreOperations(statistiques.depots.nombre)}
            />
            <CarteChiffre
              libelle="Retraits"
              valeur={`${formaterMontant(statistiques.retraits.montant)} DA`}
              icone={<IconeRetrait size={18} />}
              ton="amber"
              estMonnaie
              precision={libelleNombreOperations(statistiques.retraits.nombre)}
            />
            <CarteChiffre
              libelle="Virements"
              valeur={`${formaterMontant(statistiques.virements.montant)} DA`}
              icone={<IconeOperations size={18} />}
              ton="blue"
              estMonnaie
              precision={`${libelleNombreOperations(statistiques.virements.nombre)} · compté une fois (ligne débit)`}
            />
            <CarteChiffre
              libelle="Solde total actuel"
              valeur={`${formaterMontant(statistiques.solde_total_actuel)} DA`}
              icone={<IconeBanque size={18} />}
              ton="violet"
              estMonnaie
              precision="Indépendant de la période sélectionnée"
            />
          </div>

          {comptes.length > 0 && (
            <section className="panel max-w-md">
              <div className="panel-heading">
                <div>
                  <h2>Répartition des comptes</h2>
                  <p>Courants et épargne</p>
                </div>
              </div>
              <AccountDistribution comptes={comptes} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
