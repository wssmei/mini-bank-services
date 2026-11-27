import { useEffect, useState } from "react";
import { obtenirStatistiquesCompte } from "../../api/consultation.js";
import { Bouton } from "../../components/Bouton.jsx";
import CarteChiffre from "../../components/CarteChiffre.jsx";
import Champ from "../../components/Champ.jsx";
import ChampSelectRecherche from "../../components/ChampSelectRecherche.jsx";
import {
  IconeComptes,
  IconeDepot,
  IconeOperations,
  IconeRetrait,
} from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { EtatVide } from "../../components/UiPrimitives.jsx";
import {
  decouvertAutorise,
  nomDuTitulaire,
  soldeDisponibleRetrait,
} from "../../utils/comptes.js";
import { libelleNombreOperations } from "../../utils/libelles.js";
import { formaterMontant } from "../../utils/montants.js";
import { normaliserDateIso, validerPeriode } from "../../utils/periodes.js";

// Totaux d'un compte sur une période facultative, avec sélecteur de compte recherchable.
export default function StatistiquesCompte({
  options,
  comptes = [],
  clients = [],
  compteInitialId = "",
}) {
  const [filtres, setFiltres] = useState({
    compteId: compteInitialId,
    dateDebut: "",
    dateFin: "",
  });
  const [resultat, setResultat] = useState({ cle: "", statistiques: null, erreur: "" });

  const cle = JSON.stringify(filtres);
  const erreurPeriode = validerPeriode(filtres.dateDebut, filtres.dateFin);
  const enAttente = filtres.compteId !== "" && erreurPeriode === "" && resultat.cle !== cle;
  const statistiques = resultat.cle === cle ? resultat.statistiques : null;
  const erreur = resultat.cle === cle ? resultat.erreur : "";
  const compteSelectionne = comptes.find((c) => String(c.id) === filtres.compteId) ?? null;

  function modifierFiltre(champ, valeur) {
    const valeurPropre =
      champ === "dateDebut" || champ === "dateFin" ? normaliserDateIso(valeur) : valeur;
    setFiltres((precedents) => ({ ...precedents, [champ]: valeurPropre }));
  }

  useEffect(() => {
    const { compteId, dateDebut, dateFin } = filtres;
    if (compteId === "" || validerPeriode(dateDebut, dateFin) !== "") return;

    let actif = true;
    const cleCourante = JSON.stringify(filtres);
    obtenirStatistiquesCompte(compteId, {
      dateDebut: normaliserDateIso(dateDebut),
      dateFin: normaliserDateIso(dateFin),
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
  }, [filtres]);

  const aUnePeriode = Boolean(filtres.dateDebut || filtres.dateFin);

  return (
    <div className="space-y-6">
      <section className="panel overflow-visible">
        <div className="panel-heading">
          <div>
            <h2>Sélection du compte et de la période</h2>
            <p>Les dates sont facultatives. Sans période, le solde net égale le solde du compte.</p>
          </div>
          {aUnePeriode && (
            <Bouton
              variant="outline"
              size="sm"
              onClick={() =>
                setFiltres((precedents) => ({ ...precedents, dateDebut: "", dateFin: "" }))
              }
            >
              Réinitialiser les dates
            </Bouton>
          )}
        </div>
        <div className="filters cols-3">
          <ChampSelectRecherche
            id="stats-compte"
            libelle="Compte"
            placeholder="Rechercher par numéro ou titulaire…"
            videTexte="Aucun compte trouvé."
            options={options}
            valeur={filtres.compteId}
            onChange={(valeur) => modifierFiltre("compteId", valeur)}
          />
          <Champ
            id="stats-compte-debut"
            libelle="Date de début"
            type="date"
            valeur={filtres.dateDebut}
            onChange={(e) => modifierFiltre("dateDebut", e.target.value)}
          />
          <Champ
            id="stats-compte-fin"
            libelle="Date de fin"
            type="date"
            valeur={filtres.dateFin}
            onChange={(e) => modifierFiltre("dateFin", e.target.value)}
            erreur={erreurPeriode}
          />
        </div>
      </section>

      <Message type="erreur" texte={erreur} />

      {filtres.compteId === "" ? (
        <section className="panel">
          <EtatVide
            titre="Sélectionnez un compte"
            message="Recherchez et choisissez un compte pour consulter ses statistiques."
          />
        </section>
      ) : enAttente ? (
        <p className="muted">Chargement…</p>
      ) : statistiques ? (
        <>
          {compteSelectionne && (
            <h2 className="stats-title">
              {nomDuTitulaire(compteSelectionne.client_id, clients)}{" "}
              <span className="mono muted">· {compteSelectionne.numero}</span>
            </h2>
          )}

          <div className="metric-grid stats-block">
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
              libelle="Virements émis"
              valeur={`${formaterMontant(statistiques.virements_emis.montant)} DA`}
              icone={<IconeRetrait size={18} />}
              ton="blue"
              estMonnaie
              precision={libelleNombreOperations(statistiques.virements_emis.nombre)}
            />
            <CarteChiffre
              libelle="Virements reçus"
              valeur={`${formaterMontant(statistiques.virements_recus.montant)} DA`}
              icone={<IconeDepot size={18} />}
              ton="teal"
              estMonnaie
              precision={libelleNombreOperations(statistiques.virements_recus.nombre)}
            />
          </div>

          <div className="metric-grid cols-3">
            <CarteChiffre
              libelle="Solde net de la période"
              valeur={`${formaterMontant(statistiques.solde_net_periode)} DA`}
              icone={<IconeOperations size={18} />}
              ton="mint"
              estMonnaie
              precision="Sans période : égal au solde du compte"
            />
            {compteSelectionne && (
              <>
                <CarteChiffre
                  libelle="Solde actuel du compte"
                  valeur={`${formaterMontant(compteSelectionne.solde)} DA`}
                  icone={<IconeComptes size={18} />}
                  ton="blue"
                  estMonnaie
                  precision={`Découvert autorisé : ${formaterMontant(
                    decouvertAutorise(compteSelectionne.type_compte),
                  )} DA`}
                />
                <CarteChiffre
                  libelle="Solde disponible au retrait"
                  valeur={`${formaterMontant(soldeDisponibleRetrait(compteSelectionne))} DA`}
                  icone={<IconeComptes size={18} />}
                  ton="teal"
                  estMonnaie
                  precision={
                    compteSelectionne.type_compte === "COURANT"
                      ? "Inclut le découvert de 5 000,00 DA"
                      : "Compte épargne sans découvert"
                  }
                />
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
